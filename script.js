// Enhanced loadCiliaHubData function with new features
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

    // Statistics tracking
    let statsData = {
        totalGenes: 0,
        uniqueLocalizations: new Set(),
        withOMIM: 0,
        withReferences: 0,
        localizationCounts: {}
    };

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

    // NEW FEATURE 2: Auto-suggestions functionality
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

    // NEW FEATURE 3: Advanced filtering function
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

    // NEW FEATURE 1: Statistics calculation and visualization
    function calculateStatistics() {
        statsData.totalGenes = data.length;
        statsData.withOMIM = data.filter(item => item.omim_id && item.omim_id.trim()).length;
        statsData.withReferences = data.filter(item => item.reference && item.reference.trim()).length;
        
        // Calculate localization distribution
        statsData.localizationCounts = {};
        data.forEach(item => {
            if (item.localization && item.localization.trim()) {
                const loc = item.localization.trim();
                if (!statsData.uniqueLocalizations.has(loc)) {
                    statsData.uniqueLocalizations.add(loc);
                }
                statsData.localizationCounts[loc] = (statsData.localizationCounts[loc] || 0) + 1;
            }
        });

        // Update stat cards
        document.getElementById('total-genes').textContent = statsData.totalGenes;
        document.getElementById('unique-localizations').textContent = statsData.uniqueLocalizations.size;
        document.getElementById('with-omim').textContent = statsData.withOMIM;
        document.getElementById('with-references').textContent = statsData.withReferences;
    }

    function createCharts() {
        // Localization Chart
        const locCtx = document.getElementById('localizationChart');
        if (locCtx) {
            const locData = Object.entries(statsData.localizationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8); // Top 8 localizations

            new Chart(locCtx, {
                type: 'doughnut',
                data: {
                    labels: locData.map(([label]) => label.length > 15 ? label.substring(0, 12) + '...' : label),
                    datasets: [{
                        data: locData.map(([, count]) => count),
                        backgroundColor: [
                            '#203c78', '#4a6fa5', '#6d8bc9', '#90a7dd',
                            '#b3c3f1', '#d6dfff', '#f0f4ff', '#e6f2ff'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 8,
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });
        }

        // Growth Chart (simulated data)
        const growthCtx = document.getElementById('growthChart');
        if (growthCtx) {
            const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
            const cumulative = [500, 750, 1200, 1600, 1900, statsData.totalGenes];

            new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Genes in Database',
                        data: cumulative,
                        borderColor: '#203c78',
                        backgroundColor: 'rgba(32, 60, 120, 0.1)',
                        fill: true,
                        tension: 0.3
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
                                text: 'Number of Genes'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Year'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
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

// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ciliahub')) {
        loadCiliaHubData();
    }
});
