document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const searchInput = document.getElementById('ciliahub-search');
    const suggestions = document.getElementById('search-suggestions');
    const batchQueryInput = document.getElementById('batchGenes');
    const batchQueryBtn = document.getElementById('batchQueryBtn');
    const batchResults = document.getElementById('batchResults');
    const batchResultsContainer = document.getElementById('batchResultsContainer');
    const clearBatchResults = document.getElementById('clearBatchResults');
    const table = document.getElementById('ciliahub-table');
    const tableBody = document.getElementById('ciliahub-table-body');
    const loading = document.getElementById('ciliahub-loading');
    const filterSelect = document.getElementById('ciliahub-filter');
    const omimFilter = document.getElementById('omim-filter');
    const referenceFilter = document.getElementById('reference-filter');
    const synonymFilter = document.getElementById('synonym-filter');
    const resetBtn = document.getElementById('ciliahub-reset');
    const downloadBtn = document.getElementById('download-ciliahub');
    const exportFilteredBtn = document.getElementById('export-filtered');
    const resultsCounter = document.getElementById('results-counter');
    const popularGenesList = document.getElementById('popularGenesList');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxClose = document.querySelector('.lightbox-close');
    const pubSearch = document.getElementById('pub-search');
    const backToTopBtn = document.getElementById('back-to-top');
    const functionalGroupsContainer = document.getElementById('functionalGeneGroupsContainer');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const errorDiv = document.getElementById('ciliahub-error');

    // Data and state
    let data = [];
    let filteredData = [];
    let searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
    let allGeneNames = new Set();
    let allSynonyms = new Set();
    let allEnsemblIds = new Set();
    let currentPage = 1;
    const groupsPerPage = 9; // Display 9 groups per page
    let debounceTimeout;

    // Statistics tracking
    let statsData = {
        totalCiliaGenes: 0,
        ciliaLocalizations: new Set(),
        ciliaWithOMIM: 0,
        ciliaWithReferences: 0,
        ciliaLocalizationCounts: {}
    };

    // Cilia-related localization categories
    const ciliaRelatedCategories = {
        'cilia': ['cilia', 'cilium', 'ciliary'],
        'transition zone': ['transition zone', 'transition-zone'],
        'basal body': ['basal body', 'basal-body', 'centriole'],
        'flagella': ['flagella', 'flagellum'],
        'cilia associated': ['cilia associated', 'ciliary associated', 'cilia-associated', 'ciliary-associated'],
        'basal-body-cilia': ['basal body, cilia', 'basal-body-cilia'],
        'cilia-basal-body': ['cilia, basal body', 'cilia-basal-body'],
        'flagella-cilia': ['flagella, cilia', 'flagella-cilia'],
        'cilia-basal-body-transition-zone': ['cilia, basal body, transition zone', 'cilia-basal-body-transition-zone'],
        'flagella-cilia-basal-body': ['flagella, cilia, basal body', 'flagella-cilia-basal-body'],
        'ciliary-associated-gene': ['ciliary associated gene', 'ciliary-associated-gene']
    };

    function isCiliaRelated(localization) {
        if (!localization) return false;
        const locLower = localization.toLowerCase().trim();
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
        loading.style.display = 'none';
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
        resultsCounter.textContent = `Showing ${count} genes`;
        resultsCounter.style.display = count > 0 ? 'block' : 'none';
    }

    function populateTable(dataToShow = []) {
        tableBody.innerHTML = '';
        filteredData = dataToShow;
        if (dataToShow.length === 0) {
            loading.innerHTML = 'Enter a search term to explore the CiliaHub database...';
            loading.style.display = 'block';
            table.style.display = 'none';
            updateResultsCounter(0);
            return;
        }

        dataToShow.forEach(item => {
            const sanitizedLocalization = (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-');
            const referenceLinks = formatReference(item.reference);
            const synonyms = item.synonym ? item.synonym.split(',').map(s => s.trim()).join('<br>') : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                <td class="description" data-full-text="${item.description || ''}">${item.description || ''}</td>
                <td>${synonyms}</td>
                <td>${item.omim_id ? `<a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a>` : 'N/A'}</td>
                <td class="reference" data-tooltip="${item.reference || ''}">${referenceLinks}</td>
                <td>${item.localization || ''}</td>
            `;
            if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
            tableBody.appendChild(row);
        });

        loading.style.display = 'none';
        table.style.display = 'table';
        updateResultsCounter(dataToShow.length);
    }

    function updatePopularGenes() {
        const sortedGenes = Object.entries(searchCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        popularGenesList.innerHTML = sortedGenes.length
            ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
            : '<li>No searches yet.</li>';
    }

    function showSuggestions(query) {
        if (!query || query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }

        const suggestionsList = [];
        const queryLower = query.toLowerCase();

        [...allGeneNames].forEach(gene => {
            if (gene.toLowerCase().includes(queryLower) && suggestionsList.length < 8) {
                suggestionsList.push({ text: gene, type: 'gene' });
            }
        });

        [...allSynonyms].forEach(synonym => {
            if (synonym.toLowerCase().includes(queryLower) && suggestionsList.length < 8) {
                suggestionsList.push({ text: synonym, type: 'synonym' });
            }
        });

        [...allEnsemblIds].forEach(id => {
            if (id.toLowerCase().includes(queryLower) && suggestionsList.length < 8) {
                suggestionsList.push({ text: id, type: 'ensembl' });
            }
        });

        if (suggestionsList.length > 0) {
            suggestions.innerHTML = suggestionsList.map(s =>
                `<div class="suggestion-item" data-type="${s.type}">${s.text} <span class="suggestion-type">${s.type}</span></div>`
            ).join('');
            suggestions.style.display = 'block';

            suggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    searchInput.value = item.textContent.replace(/\s+(gene|synonym|ensembl)$/, '');
                    suggestions.style.display = 'none';
                    searchCounts[searchInput.value] = (searchCounts[searchInput.value] || 0) + 1;
                    sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
                    updatePopularGenes();
                    applyFilters();
                });
            });
        } else {
            suggestions.style.display = 'none';
        }
    }

    function applyFilters() {
        hideError();
        const query = searchInput.value.toLowerCase().trim();
        const localizationFilter = filterSelect.value.toLowerCase();
        const omimFilterValue = omimFilter.value;
        const referenceFilterValue = referenceFilter.value;
        const synonymFilterValue = synonymFilter.value.toLowerCase().trim();

        if (!query && !localizationFilter && !omimFilterValue && !referenceFilterValue && !synonymFilterValue) {
            loading.innerHTML = 'Enter a search term to explore the CiliaHub database...';
            loading.style.display = 'block';
            table.style.display = 'none';
            updateResultsCounter(0);
            return;
        }

        filteredData = data.filter(item => {
            let textMatch = true;
            if (query) {
                textMatch = (item.gene && item.gene.toLowerCase().includes(query)) ||
                           (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                           (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                           (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                           (item.reference && item.reference.toLowerCase().includes(query));
            }

            let localizationMatch = true;
            if (localizationFilter) {
                localizationMatch = (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === localizationFilter;
            }

            let omimMatch = true;
            if (omimFilterValue === 'has-omim') {
                omimMatch = item.omim_id && item.omim_id.trim() !== '';
            } else if (omimFilterValue === 'no-omim') {
                omimMatch = !item.omim_id || item.omim_id.trim() === '';
            }

            let referenceMatch = true;
            if (referenceFilterValue === 'has-reference') {
                referenceMatch = item.reference && item.reference.trim() !== '';
            } else if (referenceFilterValue === 'no-reference') {
                referenceMatch = !item.reference || item.reference.trim() === '';
            }

            let synonymMatch = true;
            if (synonymFilterValue) {
                synonymMatch = item.synonym && item.synonym.toLowerCase().includes(synonymFilterValue);
            }

            return textMatch && localizationMatch && omimMatch && referenceMatch && synonymMatch;
        });

        populateTable(filteredData);
    }

    function debounce(func, wait) {
        return function (...args) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function calculateStatistics() {
        const ciliaRelatedGenes = data.filter(item => isCiliaRelated(item.localization));
        statsData.totalCiliaGenes = ciliaRelatedGenes.length;
        statsData.ciliaWithOMIM = ciliaRelatedGenes.filter(item => item.omim_id && item.omim_id.trim()).length;
        statsData.ciliaWithReferences = ciliaRelatedGenes.filter(item => item.reference && item.reference.trim()).length;

        statsData.ciliaLocalizationCounts = {};
        ciliaRelatedGenes.forEach(item => {
            if (item.localization && item.localization.trim()) {
                const category = isCiliaRelated(item.localization);
                if (category) {
                    statsData.ciliaLocalizations.add(category);
                    statsData.ciliaLocalizationCounts[category] = (statsData.ciliaLocalizationCounts[category] || 0) + 1;
                }
            }
        });

        document.getElementById('total-genes').textContent = statsData.totalCiliaGenes;
        document.getElementById('unique-localizations').textContent = statsData.ciliaLocalizations.size;
        document.getElementById('with-omim').textContent = statsData.ciliaWithOMIM;
        document.getElementById('with-references').textContent = statsData.ciliaWithReferences;
    }

    function createCharts() {
        const locCtx = document.getElementById('localizationChart');
        if (locCtx) {
            const ciliaLocData = Object.entries(statsData.ciliaLocalizationCounts).sort((a, b) => b[1] - a[1]);
            new Chart(locCtx, {
                type: 'pie',
                data: {
                    labels: ciliaLocData.map(([label]) => label.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')),
                    datasets: [{
                        data: ciliaLocData.map(([, count]) => count),
                        backgroundColor: ['#203c78', '#4a6fa5', '#6d8bc9', '#90a7dd', '#b3c3f1'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 15, padding: 10, font: { size: 11 }, usePointStyle: true } },
                        title: { display: true, text: 'Cilia-Related Gene Distribution by Localization', font: { size: 14, weight: 'bold' }, color: '#203c78' },
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
                        y: { beginAtZero: true, title: { display: true, text: 'Number of Cilia-Related Genes', font: { size: 12, weight: 'bold' }, color: '#203c78' }, grid: { color: 'rgba(32, 60, 120, 0.1)' } },
                        x: { title: { display: true, text: 'Year', font: { size: 12, weight: 'bold' }, color: '#203c78' }, grid: { color: 'rgba(32, 60, 120, 0.1)' } }
                    },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { font: { size: 11 } } },
                        title: { display: true, text: 'CiliaHub Database Growth Over Time', font: { size: 14, weight: 'bold' }, color: '#203c78' }
                    }
                }
            });
        }
    }

    function populateFunctionalGroups() {
        if (!functionalGroupsContainer) return;
        functionalGroupsContainer.innerHTML = '';
        const categoryMap = {};

        data.forEach(row => {
            if (row.functional_category && row.functional_category !== 'Unknown') {
                const categories = row.functional_category.split('; ').filter(cat => cat);
                categories.forEach(cat => {
                    if (!categoryMap[cat]) {
                        categoryMap[cat] = { genes: [], count: 0 };
                    }
                    categoryMap[cat].genes.push(row.gene);
                    categoryMap[cat].count++;
                });
            }
        });

        const sortedCategories = Object.keys(categoryMap).sort();
        const start = (currentPage - 1) * groupsPerPage;
        const end = start + groupsPerPage;

        sortedCategories.slice(start, end).forEach(category => {
            const groupItem = document.createElement('details');
            groupItem.className = 'group-item';
            groupItem.innerHTML = `
                <summary aria-label="${category} gene group">${category} (${categoryMap[category].count} genes)</summary>
                <div class="group-content">
                    <p>Genes: ${categoryMap[category].genes.join(', ')}</p>
                </div>
            `;
            functionalGroupsContainer.appendChild(groupItem);
        });

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = end >= sortedCategories.length;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            populateFunctionalGroups();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage * groupsPerPage < Object.keys(data.reduce((map, row) => {
            if (row.functional_category && row.functional_category !== 'Unknown') {
                row.functional_category.split('; ').filter(cat => cat).forEach(cat => map[cat] = true);
            }
            return map;
        }, {})).length) {
            currentPage++;
            populateFunctionalGroups();
        }
    });

    async function fetchData() {
        try {
            loading.style.display = 'block';
            table.style.display = 'none';
            const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data_with_functions.json');
            if (!response.ok) throw new Error('Failed to fetch data');
            data = await response.json();
            console.log('Loaded entries:', data.length);

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

            calculateStatistics();
            createCharts();
            populateFunctionalGroups();
            loading.innerHTML = 'Enter a search term to explore the CiliaHub database...';
            loading.style.display = 'block';
            table.style.display = 'none';
            updatePopularGenes();
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Failed to load CiliaHub data. Please check your network or contact support.');
        }
    }

    searchInput.addEventListener('input', debounce((e) => {
        showSuggestions(e.target.value);
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
        suggestions.style.display = 'none';
        searchCounts = {};
        sessionStorage.removeItem('popularGenes');
        updatePopularGenes();
        loading.innerHTML = 'Enter a search term to explore the CiliaHub database...';
        loading.style.display = 'block';
        table.style.display = 'none';
        updateResultsCounter(0);
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
        const input = batchQueryInput.value.trim();
        if (!input) {
            batchResults.innerHTML = '<p style="color: red;">Please enter at least one gene name or ID.</p>';
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
            batchResults.innerHTML = '<p>No matching genes found.</p>';
            batchResultsContainer.style.display = 'block';
            return;
        }
        batchResults.innerHTML = `
            <table class="ciliahub-table">
                <thead>
                    <tr>
                        <th>Gene</th>
                        <th>Ensembl ID</th>
                        <th>Description</th>
                        <th>Synonym</th>
                        <th>OMIM ID</th>
                        <th>Reference</th>
                        <th>Localization</th>
                    </tr>
                </thead>
                <tbody>
                    ${batchFiltered.map(item => {
                        const referenceLinks = formatReference(item.reference);
                        return `
                            <tr>
                                <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                                <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                                <td>${item.description || ''}</td>
                                <td>${item.synonym || ''}</td>
                                <td>${item.omim_id ? `<a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a>` : 'N/A'}</td>
                                <td>${referenceLinks}</td>
                                <td>${item.localization || ''}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        batchResultsContainer.style.display = 'block';
        populateTable(batchFiltered);
    });

    clearBatchResults.addEventListener('click', () => {
        batchResults.innerHTML = '';
        batchResultsContainer.style.display = 'none';
        batchQueryInput.value = '';
        applyFilters();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestions.style.display = 'none';
        }
    });

    function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
        }
    }

    document.querySelectorAll('.navbar a, .dropdown-content a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });

    window.addEventListener('scroll', () => {
        backToTopBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('.lightbox-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            lightboxImg.src = link.href;
            lightbox.style.display = 'flex';
        });
    });

    lightboxClose.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    });

    pubSearch.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const items = document.querySelectorAll('#publications-list .research-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    });

    fetchData();
});
