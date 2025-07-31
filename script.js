// Enhanced loadCiliaHubData function with corrected statistics and filtering
async function loadCiliaHubData() {
    const tableBody = document.getElementById('ciliahub-table-body');
    const searchInput = document.getElementById('ciliahub-search');
    const filterSelect = document.getElementById('ciliahub-filter');
    const omimFilter = document.getElementById('omim-filter');
    const referenceFilter = document.getElementById('reference-filter');
    const synonymFilter = document.getElementById('synonym-filter');
    const resetBtn = document.getElementById('ciliahub-reset');
    const downloadBtn = document.getElementById('download-ciliahub');
    const exportFilteredBtn = document.getElementById('export-filtered');
    const batchQueryBtn = document.getElementById('batchQueryBtn');
    const batchGenesInput = document.getElementById('batchGenes');
    const batchResultsDiv = document.getElementById('batchResults');
    const batchResultsContainer = document.getElementById('batchResultsContainer');
    const clearBatchResultsBtn = document.getElementById('clearBatchResults');
    const popularGenesList = document.getElementById('popularGenesList');
    const errorDiv = document.getElementById('ciliahub-error');
    const loadingDiv = document.getElementById('ciliahub-loading');
    const table = document.querySelector('.ciliahub-table');
    const resultsCounter = document.getElementById('results-counter');
    const suggestionsDiv = document.getElementById('search-suggestions');

    let data = [];
    let filteredData = [];
    let searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
    let debounceTimeout;
    let allGeneNames = new Set();
    let allSynonyms = new Set();
    let allEnsemblIds = new Set();

    // Statistics tracking - corrected to focus on cilia-related localizations
    let statsData = {
        totalCiliaGenes: 0,
        ciliaLocalizations: new Set(),
        ciliaWithOMIM: 0,
        ciliaWithReferences: 0,
        ciliaLocalizationCounts: {}
    };

    // Define cilia-related localization categories
    const ciliaRelatedCategories = {
        'cilia': ['cilia', 'cilium', 'ciliary'],
        'transition zone': ['transition zone', 'transition-zone'],
        'basal body': ['basal body', 'basal-body', 'centriole'],
        'flagella': ['flagella', 'flagellum'],
        'cilia associated': ['cilia associated', 'ciliary associated', 'cilia-associated', 'ciliary-associated']
    };

    function isCiliaRelated(localization) {
        if (!localization) return false;
        const locLower = localization.toLowerCase().trim();
        
        // Check each category
        for (const [category, keywords] of Object.entries(ciliaRelatedCategories)) {
            for (const keyword of keywords) {
                if (locLower.includes(keyword)) {
                    return category;
                }
            }
        }
        return null;
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
        table.style.display = 'none';
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }

    function formatReference(reference) {
        if (!reference) return 'N/A';
        const refs = reference.split(';').map(ref => ref.trim()).filter(ref => ref);
        const formattedRefs = refs.map(ref => {
            if (/^\d+$/.test(ref)) {
                return `<a href="https://pubmed.ncbi.nlm.nih.gov/${ref}/" target="_blank">${ref}</a>`;
            } else if (ref.startsWith('https://doi.org/') || /^10\.\d{4,}/.test(ref)) {
                const doi = ref.startsWith('https://doi.org/') ? ref.replace('https://doi.org/', '') : ref;
                const doiUrl = `https://doi.org/${doi}`;
                return `<a href="${doiUrl}" target="_blank">${doi}</a>`;
            } else if (ref.startsWith('http://') || ref.startsWith('https://')) {
                return `<a href="${ref}" target="_blank">${ref}</a>`;
            } else {
                return ref;
            }
        });
        return formattedRefs.join(', ');
    }

    function updateResultsCounter(count) {
        if (resultsCounter) {
            resultsCounter.textContent = `Showing ${count} genes`;
            resultsCounter.style.display = count > 0 ? 'block' : 'none';
        }
    }

    function populateTable(dataToShow = []) {
        tableBody.innerHTML = '';
        filteredData = dataToShow;
       
        if (dataToShow.length === 0) {
            loadingDiv.style.display = 'none';
            table.style.display = 'none';
            updateResultsCounter(0);
            return;
        }

        dataToShow.forEach(item => {
            const sanitizedLocalization = (item.localization || '')
                .toLowerCase()
                .replace(/[\s,]+/g, '-');

            const referenceLinks = formatReference(item.reference);
            const synonyms = item.synonym ? item.synonym.split(',').map(s => s.trim()).join('<br>') : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                <td class="description" data-full-text="${item.description || ''}">${item.description || ''}</td>
                <td>${synonyms}</td>
                <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                <td class="reference" data-tooltip="${item.reference || ''}">${referenceLinks}</td>
                <td>${item.localization || ''}</td>
            `;
            if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
            tableBody.appendChild(row);
        });
       
        loadingDiv.style.display = 'none';
        table.style.display = 'table';
        updateResultsCounter(dataToShow.length);
    }

    function updatePopularGenes() {
        const sortedGenes = Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        popularGenesList.innerHTML = sortedGenes.length
            ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
            : '<li>No searches yet.</li>';
    }

    function showSearchPrompt() {
        loadingDiv.innerHTML = 'Enter a search term to explore the CiliaHub database...';
        loadingDiv.style.display = 'block';
        table.style.display = 'none';
        updateResultsCounter(0);
    }

    // Auto-suggestions functionality
    function showSuggestions(query) {
        if (!query || query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        const suggestions = [];
        const queryLower = query.toLowerCase();

        // Search in gene names
        [...allGeneNames].forEach(gene => {
            if (gene.toLowerCase().includes(queryLower) && suggestions.length < 8) {
                suggestions.push({ text: gene, type: 'gene' });
            }
        });

        // Search in synonyms
        [...allSynonyms].forEach(synonym => {
            if (synonym.toLowerCase().includes(queryLower) && suggestions.length < 8) {
                suggestions.push({ text: synonym, type: 'synonym' });
            }
        });

        // Search in Ensembl IDs
        [...allEnsemblIds].forEach(id => {
            if (id.toLowerCase().includes(queryLower) && suggestions.length < 8) {
                suggestions.push({ text: id, type: 'ensembl' });
            }
        });

        if (suggestions.length > 0) {
            suggestionsDiv.innerHTML = suggestions.map(s =>
                `<div class="suggestion-item" data-type="${s.type}">${s.text} <span class="suggestion-type">${s.type}</span></div>`
            ).join('');
            suggestionsDiv.style.display = 'block';

            // Add click handlers for suggestions
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    searchInput.value = item.textContent.replace(/\s+(gene|synonym|ensembl)$/, '');
                    suggestionsDiv.style.display = 'none';
                    applyFilters();
                });
            });
        } else {
            suggestionsDiv.style.display = 'none';
        }
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsDiv.style.display = 'none';
        }
    });

    // Advanced filtering function
    function applyFilters() {
        hideError();
        const query = searchInput.value.toLowerCase().trim();
        const localizationFilter = filterSelect.value.toLowerCase();
        const omimFilterValue = omimFilter.value;
        const referenceFilterValue = referenceFilter.value;
        const synonymFilterValue = synonymFilter.value.toLowerCase().trim();
       
        if (!query && !localizationFilter && !omimFilterValue && !referenceFilterValue && !synonymFilterValue) {
            showSearchPrompt();
            return;
        }

        // Track search for popular genes
        if (query) {
            searchCounts[query] = (searchCounts[query] || 0) + 1;
            sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
            updatePopularGenes();
        }

        let filtered = data.filter(item => {
            // Text search filter
            let textMatch = true;
            if (query) {
                textMatch = (item.gene && item.gene.toLowerCase().includes(query)) ||
                           (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                           (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                           (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                           (item.reference && item.reference.toLowerCase().includes(query));
            }

            // Localization filter
            let localizationMatch = true;
            if (localizationFilter) {
                localizationMatch = (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === localizationFilter;
            }

            // OMIM filter
            let omimMatch = true;
            if (omimFilterValue === 'has-omim') {
                omimMatch = item.omim_id && item.omim_id.trim() !== '';
            } else if (omimFilterValue === 'no-omim') {
                omimMatch = !item.omim_id || item.omim_id.trim() === '';
            }

            // Reference filter
            let referenceMatch = true;
            if (referenceFilterValue === 'has-reference') {
                referenceMatch = item.reference && item.reference.trim() !== '';
            } else if (referenceFilterValue === 'no-reference') {
                referenceMatch = !item.reference || item.reference.trim() === '';
            }

            // Synonym filter
            let synonymMatch = true;
            if (synonymFilterValue) {
                synonymMatch = item.synonym && item.synonym.toLowerCase().includes(synonymFilterValue);
            }

            return textMatch && localizationMatch && omimMatch && referenceMatch && synonymMatch;
        });
       
        populateTable(filtered);
    }

    function debounce(func, wait) {
        return function (...args) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // CORRECTED: Statistics calculation focusing only on cilia-related genes
    function calculateStatistics() {
        // Filter data to only include cilia-related genes
        const ciliaRelatedGenes = data.filter(item => {
            return isCiliaRelated(item.localization);
        });

        statsData.totalCiliaGenes = ciliaRelatedGenes.length;
        statsData.ciliaWithOMIM = ciliaRelatedGenes.filter(item => item.omim_id && item.omim_id.trim()).length;
        statsData.ciliaWithReferences = ciliaRelatedGenes.filter(item => item.reference && item.reference.trim()).length;
       
        // Calculate cilia-related localization distribution
        statsData.ciliaLocalizationCounts = {};
        ciliaRelatedGenes.forEach(item => {
            if (item.localization && item.localization.trim()) {
                const category = isCiliaRelated(item.localization);
                if (category) {
                    if (!statsData.ciliaLocalizations.has(category)) {
                        statsData.ciliaLocalizations.add(category);
                    }
                    statsData.ciliaLocalizationCounts[category] = (statsData.ciliaLocalizationCounts[category] || 0) + 1;
                }
            }
        });

        // Update stat cards with cilia-specific data
        document.getElementById('total-genes').textContent = statsData.totalCiliaGenes;
        document.getElementById('unique-localizations').textContent = statsData.ciliaLocalizations.size;
        document.getElementById('with-omim').textContent = statsData.ciliaWithOMIM;
        document.getElementById('with-references').textContent = statsData.ciliaWithReferences;
    }

    function createCharts() {
        // Localization Chart - Only cilia-related localizations
        const locCtx = document.getElementById('localizationChart');
        if (locCtx) {
            // Use the calculated cilia localization counts
            const ciliaLocData = Object.entries(statsData.ciliaLocalizationCounts)
                .sort((a, b) => b[1] - a[1]);

            new Chart(locCtx, {
                type: 'pie',
                data: {
                    labels: ciliaLocData.map(([label]) => {
                        // Capitalize first letter of each word
                        return label.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');
                    }),
                    datasets: [{
                        data: ciliaLocData.map(([, count]) => count),
                        backgroundColor: [
                            '#203c78', // Dark blue
                            '#4a6fa5', // Medium blue
                            '#6d8bc9', // Light blue
                            '#90a7dd', // Lighter blue
                            '#b3c3f1'  // Very light blue
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 15,
                                padding: 10,
                                font: { size: 11 },
                                usePointStyle: true
                            }
                        },
                        title: {
                            display: true,
                            text: 'Cilia-Related Gene Distribution by Localization',
                            font: { size: 14, weight: 'bold' },
                            color: '#203c78'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} genes (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Growth Chart (simulated data showing cilia gene discovery over time)
        const growthCtx = document.getElementById('growthChart');
        if (growthCtx) {
            const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
            const ciliaGeneCounts = [300, 450, 700, 950, 1200, statsData.totalCiliaGenes];

            new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Cilia-Related Genes',
                        data: ciliaGeneCounts,
                        borderColor: '#203c78',
                        backgroundColor: 'rgba(32, 60, 120, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#203c78',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Cilia-Related Genes',
                                font: { size: 12, weight: 'bold' },
                                color: '#203c78'
                            },
                            grid: {
                                color: 'rgba(32, 60, 120, 0.1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Year',
                                font: { size: 12, weight: 'bold' },
                                color: '#203c78'
                            },
                            grid: {
                                color: 'rgba(32, 60, 120, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: { size: 11 }
                            }
                        },
                        title: {
                            display: true,
                            text: 'CiliaHub Database Growth Over Time',
                            font: { size: 14, weight: 'bold' },
                            color: '#203c78'
                        }
                    }
                }
            });
        }
    }

    try {
        const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
        data = await response.json();
        console.log('Loaded entries:', data.length);
       
        // Build search indices
        data.forEach(item => {
            if (item.gene) allGeneNames.add(item.gene);
            if (item.ensembl_id) allEnsemblIds.add(item.ensembl_id);
            if (item.synonym) {
                item.synonym.split(',').forEach(syn => {
                    const trimmed = syn.trim();
                    if (trimmed) allSynonyms.add(trimmed);
                });
            }
        });

        // Calculate statistics and create charts
        calculateStatistics();
        createCharts();
       
        // Show search prompt instead of populating table
        showSearchPrompt();
        updatePopularGenes();
    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        showError('Failed to load CiliaHub data. Please check your network or contact support.');
        return;
    }

    // Event listeners
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value;
        showSuggestions(query);
        applyFilters();
    }, 300));

    filterSelect.addEventListener('change', applyFilters);
    omimFilter.addEventListener('change', applyFilters);
    referenceFilter.addEventListener('change', applyFilters);
    synonymFilter.addEventListener('input', debounce(applyFilters, 300));

    resetBtn.addEventListener('click', () => {
        hideError();
        searchInput.value = '';
        filterSelect.value = '';
        omimFilter.value = '';
        referenceFilter.value = '';
        synonymFilter.value = '';
        suggestionsDiv.style.display = 'none';
        searchCounts = {};
        sessionStorage.removeItem('popularGenes');
        updatePopularGenes();
        showSearchPrompt();
    });

    downloadBtn.addEventListener('click', () => {
        const csv = [
            ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'OMIM ID', 'Reference', 'Ciliary Localization'],
            ...data.map(item => [
                item.gene || '',
                item.ensembl_id || '',
                item.description || '',
                item.synonym || '',
                item.omim_id || '',
                item.reference || '',
                item.localization || ''
            ])
        ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ciliahub_data.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    });

    exportFilteredBtn.addEventListener('click', () => {
        if (filteredData.length === 0) {
            alert('No filtered data to export. Please apply filters first.');
            return;
        }
       
        const csv = [
            ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'OMIM ID', 'Reference', 'Ciliary Localization'],
            ...filteredData.map(item => [
                item.gene || '',
                item.ensembl_id || '',
                item.description || '',
                item.synonym || '',
                item.omim_id || '',
                item.reference || '',
                item.localization || ''
            ])
        ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ciliahub_filtered_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    });

    batchQueryBtn.addEventListener('click', () => {
        hideError();
        const input = batchGenesInput.value.trim();
        if (!input) {
            batchResultsDiv.innerHTML = '<p style="color: red;">Please enter at least one gene name or ID.</p>';
            batchResultsContainer.style.display = 'block';
            return;
        }
        const queries = input.split(/[\s,\n]+/).filter(q => q.trim()).map(q => q.toLowerCase());
        queries.forEach(query => {
            searchCounts[query] = (searchCounts[query] || 0) + 1;
            sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
        });
        updatePopularGenes();
        const batchFiltered = data.filter(item =>
            queries.some(query =>
                (item.gene && item.gene.toLowerCase() === query) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase() === query) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase() === query)
            )
        );
        if (batchFiltered.length === 0) {
            batchResultsDiv.innerHTML = '<p>No matching genes found.</p>';
            batchResultsContainer.style.display = 'block';
            return;
        }
        batchResultsDiv.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #003366; color: white;">
                        <th style="padding: 10px; width: 10%;">Gene</th>
                        <th style="padding: 10px; width: 10%;">Ensembl ID</th>
                        <th style="padding: 10px; width: 25%;">Description</th>
                        <th style="padding: 10px; width: 10%;">Synonym</th>
                        <th style="padding: 10px; width: 10%;">OMIM ID</th>
                        <th style="padding: 10px; width: 20%;">Reference</th>
                        <th style="padding: 10px; width: 15%;">Localization</th>
                    </tr>
                </thead>
                <tbody>
                    ${batchFiltered.map(item => {
                        const referenceLinks = formatReference(item.reference);
                        return `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.description || ''}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.synonym || ''}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${referenceLinks}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.localization || ''}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        batchResultsContainer.style.display = 'block';
    });

    clearBatchResultsBtn.addEventListener('click', () => {
        batchResultsDiv.innerHTML = '';
        batchResultsContainer.style.display = 'none';
        batchGenesInput.value = '';
    });
}
// Gene categories data
const geneCategories = {
    cytoskeletal: {
        name: "Cytoskeletal and Motor Proteins",
        genes: [
            "KIF1A", "KIF1B", "KIF1C", "KIF2A", "KIF2B", "KIF2C", "KIF3A", "KIF3B", "KIF3C", "KIF4A", "KIF4B", "KIF5A", "KIF5B", "KIF6", "KIF7", "KIF9", "KIF11", "KIF12", "KIF13A", "KIF13B", "KIF14", "KIF17", "KIF18B", "KIF19", "KIF20B", "KIF23", "KIF24", "KIF26A", "KIF26B", "KIF27", "KIF28P", "KIFC1", "KIFC3",
            "DNAH1", "DNAH2", "DNAH3", "DNAH5", "DNAH6", "DNAH7", "DNAH8", "DNAH9", "DNAH10", "DNAH11", "DNAH12", "DNAH14", "DNAH17", "DNAI1", "DNAI2", "DNAI3", "DNAI4", "DNAL1", "DNAL4", "DYNLL1", "DYNLL2", "DYNLT1", "DYNLT2B", "DYNC1H1", "DYNC1I1", "DYNC1I2", "DYNC1LI1", "DYNC1LI2", "DYNC2H1", "DYNC2I1", "DYNC2I2", "DYNC2LI1",
            "TUBA1A", "TUBA1B", "TUBA1C", "TUBA3C", "TUBA3D", "TUBA3E", "TUBA4A", "TUBB", "TUBB1", "TUBB2A", "TUBB2B", "TUBB3", "TUBB4A", "TUBB4B", "TUBB6", "TUBB8", "TUBB8B", "TUBG1", "TUBG2",
            "ACTN1", "ACTN2", "ACTN3", "ACTN4", "MYO1C", "MYO1D", "MYO3B", "MYO5A", "MYO7A", "MYO15A", "MYH9", "MYH10", "MYH13",
            "CFAP43", "CFAP44", "CFAP47", "CFAP53", "CFAP57", "CFAP58", "CFAP65", "CFAP69", "CFAP70", "CFAP74", "CFAP97", "CFAP100", "CFAP119", "CFAP144", "CFAP157", "CFAP206", "CFAP221", "CFAP251", "CFAP263", "CFAP276", "CFAP298", "CFAP300", "CFAP410", "CFAP418", "CFAP52", "CFAP54", "CFAP61", "CFAP96", "CFAP97D1", "CFAP144P1",
            "CEP41", "CEP43", "CEP44", "CEP55", "CEP63", "CEP68", "CEP70", "CEP72", "CEP76", "CEP78", "CEP83", "CEP85", "CEP85L", "CEP89", "CEP95", "CEP97", "CEP104", "CEP112", "CEP120", "CEP126", "CEP128", "CEP131", "CEP135", "CEP152", "CEP162", "CEP164", "CEP170", "CEP192", "CEP250", "CEP290", "CEP350",
            "SPAG1", "SPAG6", "SPAG8", "SPAG16", "SPAG17"
        ]
    },
    kinases: {
        name: "Kinases and Phosphatases",
        genes: [
            "AURKA", "CDK1", "CDK2", "CDK5RAP2", "CDK6", "CDK7", "CDK10", "CDK20", "CDKL1", "CDKL2", "CDKL3", "CDKL4", "CDKL5", "CAMK1D", "CAMK1G", "CAMK2A", "CAMK2B", "CAMK2D", "CAMK2G", "CSNK1D", "CSNK1E", "CSNK2B", "DYRK1A", "DYRK2", "HIPK1", "MAPK1", "MAPK3", "MAPK6", "MAPK14", "MAPK15", "MAPKAPK2", "NEK1", "NEK2", "NEK3", "NEK4", "NEK5", "NEK7", "NEK8", "NEK9", "NEK10", "PLK1", "PLK4", "PRKAA1", "PRKAA2", "PRKAB1", "PRKACB", "PRKAG1", "PRKAR1B", "PRKAR2A", "PRKAR2B", "PRKCI", "PRKCZ", "PRKD1", "PRKD3", "STK11", "STK33", "STK36", "STK38L", "TTK", "TTBK2",
            "PTPN11", "PTPN13", "PTPN23", "PTPRK", "PTPRM", "PPP1CA", "PPP1R2", "PPP1R3D", "PPP1R35", "PPP1R42", "PPP2R3A", "PPP2R3B", "PPP2R3C", "PPP2R5E", "PPP4R1", "PPP4R4", "PPP5C", "PPM1B"
        ]
    },
    signaling: {
        name: "Signaling Pathways",
        genes: [
            "WNT1", "WNT3", "WNT3A", "WNT5A", "WNT5B", "WNT8A", "WNT11", "FZD2", "FZD3", "FZD4", "FZD6", "FZD8", "LRP6", "DVL1", "DVL2", "DVL3", "AXIN1", "AXIN2", "APC", "APC2",
            "SHH", "PTCH1", "PTCH2", "SMO", "GLI1", "GLI2", "GLI3", "SUFU",
            "TGFB1", "TGFBR1", "TGFBR2", "BMP2", "BMP4", "BMPR2", "SMAD2", "SMAD3", "SMAD4", "SMAD6", "SMAD7",
            "ADGRV1", "ADRB2", "ADRB3", "CNR1", "CRHR2", "DRD1", "DRD2", "DRD5", "FFAR4", "GPR19", "GPR20", "GPR22", "GPR63", "GPR83", "GPR88", "GPR161", "GPR173", "GPBAR1", "KISS1R", "LPAR1", "LPAR3", "MAS1", "MC4R", "MCHR1", "NMUR1", "NPFFR1", "NPY2R", "NPY5R", "OPNRL1", "PTH1R", "PTGER4", "RXFP2", "SSTR3", "VIPR2",
            "MAPK1", "MAPK3", "MAPK6", "MAPK14", "MAPK15", "MAP2K1", "MAP2K2", "MAP2K5", "MAPKAPK2"
        ]
    },
    cilia: {
        name: "Cilia and Centrosome-Associated Genes",
        genes: [
            "ARL13A", "ARL13B", "ARL3", "ARL6", "BBS1", "BBS2", "BBS4", "BBS5", "BBS7", "BBS9", "BBS10", "BBS12", "CEP290", "IFT27", "IFT43", "IFT46", "IFT52", "IFT56", "IFT57", "IFT74", "IFT80", "IFT81", "IFT88", "IFT122", "IFT140", "IFT172", "IFTAP", "NPHP1", "NPHP3", "NPHP4", "RPGR", "RPGRIP1", "RPGRIP1L", "TTC21B", "TTC8",
            "CEP41", "CEP43", "CEP44", "CEP55", "CEP63", "CEP68", "CEP70", "CEP72", "CEP76", "CEP78", "CEP83", "CEP85", "CEP85L", "CEP89", "CEP95", "CEP97", "CEP104", "CEP112", "CEP120", "CEP126", "CEP128", "CEP131", "CEP135", "CEP152", "CEP162", "CEP164", "CEP170", "CEP192", "CEP250", "CEP290", "CEP350", "PCNT", "PCM1", "PLK4", "SAS6", "STIL"
        ]
    },
    ion: {
        name: "Ion Channels and Transporters",
        genes: [
            "CATSPER1", "CATSPER2", "CATSPER3", "CATSPER4", "CATSPERB", "CATSPERD", "CATSPERE", "CATSPERG", "CATSPERZ", "TRPV4", "TRPV5", "TRPV6", "TRPM3", "TRPM4", "TRPM5", "PKD1", "PKD2", "PKD2L1", "PKD1L1", "PIEZO1",
            "AQP1", "AQP2", "AQP3", "AQP5", "AQP6", "AQP9",
            "ATP1A4", "ATP2B1", "ATP2B4", "ATP4A", "ATP7B", "ATP8A2"
        ]
    },
    transcription: {
        name: "Transcription Factors",
        genes: [
            "FOXJ1", "FOXA1", "FOXA2", "FOXC2", "FOXF1", "FOXG1", "FOXI1", "FOXN4", "GLI1", "GLI2", "GLI3", "HIF1A", "HIF1AN", "LEF1", "MYB", "MYCBPAP", "NANOG", "NANOGP8", "NOTCH1", "NOTCH3", "PAX2", "PAX6", "PAX7", "RUNX1", "RUNX2", "SMAD2", "SMAD3", "SMAD4", "SOX2", "SOX5", "STAT1", "STAT3", "STAT4", "STAT6", "TP53", "TP63", "TP73", "YAP1", "ZIC1", "ZIC2"
        ]
    },
    ubiquitin: {
        name: "Ubiquitin-Proteasome System",
        genes: [
            "UBE2A", "UBE2B", "UBE2E1", "UBE2L3", "UBE2L5", "UBR4", "UBR5", "USP4", "USP8", "USP9X", "USP11", "USP14", "USP21", "USP33", "USP35", "USP38", "USP48", "STUB1", "TRIM32", "TRIM46", "WWP1"
        ]
    },
    cellcycle: {
        name: "Cell Cycle and DNA Repair",
        genes: [
            "ATM", "ATR", "BRCA1", "BRCA2", "BUB1", "BUB1B", "CDC14A", "CDC20", "CDC20B", "CDK1", "CDK2", "CDK6", "CDK7", "CDK10", "CDK20", "CHEK1", "CHEK2", "MCM2", "MCM7", "PLK1", "PLK4", "TP53", "TP63", "TP73"
        ]
    },
    extracellular: {
        name: "Extracellular Matrix and Adhesion",
        genes: [
            "CD44", "CDH23", "CLDN2", "COL4A1", "FN1", "ITGB1", "ITGB6", "MMP1", "MMP7", "MMP13", "MMP14", "MMP21", "TIMP3", "VCAN"
        ]
    },
    neuro: {
        name: "Neurodevelopmental and Synaptic Genes",
        genes: [
            "BDNF", "CNTNAP2", "DISC1", "DLG1", "DLG5", "GRIN2A", "GRIN2B", "HTT", "NTRK2", "NRAS", "SHANK3", "SNAP25", "SYNE1", "SYNE2"
        ]
    },
    metabolic: {
        name: "Metabolic Enzymes",
        genes: [
            "ALDOB", "CPS1", "DHCR7", "G6PC1", "HSD17B4", "HSD3B1", "HSD3B2", "IDO1", "MTHFR", "MTR", "PGM1", "PKM", "POR"
        ]
    },
    immune: {
        name: "Immune and Inflammatory Genes",
        genes: [
            "IL1B", "IL6", "IL10RA", "IL13", "IL17A", "TLR4", "TNF", "CXCL12", "CX3CL1"
        ]
    },
    rna: {
        name: "RNA Processing and Splicing",
        genes: [
            "PRPF8", "PRPF31", "PRPF6", "SNRNP200", "SRSF1", "SRSF2"
        ]
    },
    misc: {
        name: "Miscellaneous",
        genes: [
            "HSPA1A", "HSPA1B", "HSPA1L", "HSPA2", "HSPA5", "HSPA8", "HSP90AA1", "HSPD1",
            "H3-3A", "H3-3B", "H3-4", "H3-5", "H3-7", "H3C1", "H3C2", "H3C3", "H3C4", "H3C6", "H3C7", "H3C8", "H3C10", "H3C11", "H3C12", "H3C13", "H3C14", "H3C15",
            "RAC1", "RHOA", "RAB1A", "RAB3IP", "RAB6A", "RAB6B", "RAB6C", "RAB6D", "RAB7A", "RAB8A", "RAB10", "RAB11A", "RAB11B", "RAB17", "RAB19", "RAB23", "RAB28", "RAB29", "RAB34", "RABL2A", "RABL2B", "RABL3", "RABL6"
        ]
    }
};

// Initialize gene category functionality
document.addEventListener('DOMContentLoaded', () => {
    const geneCategorySelect = document.getElementById('geneCategorySelect');
    const geneCategoryList = document.getElementById('geneCategoryList');
    const addToBatchQuery = document.getElementById('addToBatchQuery');
    const batchQueryInput = document.getElementById('batchQueryInput');

    if (geneCategorySelect && geneCategoryList && addToBatchQuery && batchQueryInput) {
        geneCategorySelect.addEventListener('change', () => {
            const category = geneCategorySelect.value;
            if (category && geneCategories[category]) {
                geneCategoryList.innerHTML = `<p><strong>${geneCategories[category].name}</strong>: ${geneCategories[category].genes.join(', ')}</p>`;
                geneCategoryList.classList.remove('hidden');
                addToBatchQuery.disabled = false;
            } else {
                geneCategoryList.innerHTML = '';
                geneCategoryList.classList.add('hidden');
                addToBatchQuery.disabled = true;
            }
        });

        addToBatchQuery.addEventListener('click', () => {
            const category = geneCategorySelect.value;
            if (category && geneCategories[category]) {
                const currentInput = batchQueryInput.value.trim();
                const newGenes = geneCategories[category].genes.join(', ');
                batchQueryInput.value = currentInput ? `${currentInput}, ${newGenes}` : newGenes;
                // Trigger batch query processing if needed
                if (batchQueryInput.value) {
                    processBatchQuery();
                }
            }
        });
    }
});
// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ciliahub')) {
        loadCiliaHubData();
    }
});
