document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ciliahub')) {
        loadCiliaHubData();
    }

    // Publication search
    const searchInput = document.getElementById('pub-search');
    const pubList = document.getElementById('publications-list');
    const pubs = pubList ? pubList.querySelectorAll('.research-item') : [];

    if (searchInput && pubList) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            pubs.forEach(pub => {
                const text = pub.textContent.toLowerCase();
                pub.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }

    // Lightbox functionality
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxLinks = document.querySelectorAll('.lightbox-link');
    const closeBtn = document.querySelector('.lightbox-close');

    lightboxLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            lightboxImage.src = this.href;
            lightbox.style.display = 'flex';
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            lightbox.style.display = 'none';
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                lightbox.style.display = 'none';
            }
        });
    }

    // Back-to-top button
    const backToTopBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Night mode toggle
    const nightModeToggle = document.getElementById('night-mode-toggle');
    if (localStorage.getItem('nightMode') === 'enabled') {
        document.body.classList.add('night-mode');
    }
    if (nightModeToggle) {
        nightModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('night-mode');
            localStorage.setItem('nightMode', document.body.classList.contains('night-mode') ? 'enabled' : 'disabled');
        });
    }
});

// Enhanced CiliaHub functionality
async function loadCiliaHubData() {
    let geneData = [];
    let filteredData = [];
    let currentView = 'table';
    let comparisonGenes = [];
    let userStats = {
        searches: 0,
        bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '[]'),
        recentSearches: JSON.parse(localStorage.getItem('recentSearches') || '[]')
    };

    async function initializeApp() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
            geneData = await response.json();
            console.log(`Loaded ${geneData.length} genes`);
            document.getElementById('totalGenes').textContent = geneData.length.toLocaleString();
            updateUserStats();
            updatePopularGenes();
            displayResults();

            // Parse URL parameters for shared searches
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('query') || '';
            const localization = urlParams.get('localization')?.split(',') || [];
            const omim = urlParams.get('omim') || '';
            const synonym = urlParams.get('synonym') || '';
            const sort = urlParams.get('sort') || 'gene';

            document.getElementById('smartSearch').value = query;
            const localizationFilter = document.getElementById('localizationFilter');
            Array.from(localizationFilter.options).forEach(opt => {
                opt.selected = localization.includes(opt.value);
            });
            document.getElementById('omimFilter').value = omim;
            document.getElementById('synonymFilter').value = synonym;
            document.getElementById('sortBy').value = sort;

            if (query || localization.length || omim || synonym) {
                performSearch();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load gene data');
        }
    }

    function showError(message) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `<div style="color: red; text-align: center;">${message}</div>`;
    }

    function setupEventListeners() {
        const searchInput = document.getElementById('smartSearch');
        const localizationFilter = document.getElementById('localizationFilter');
        const omimFilter = document.getElementById('omimFilter');
        const synonymFilter = document.getElementById('synonymFilter');
        const sortBy = document.getElementById('sortBy');
        const batchQueryBtn = document.getElementById('batchQueryBtn');
        const batchGenesInput = document.getElementById('batchGenes');
        const batchResultsDiv = document.getElementById('batchResults');
        const batchResultsContainer = document.getElementById('batchResultsContainer');
        const clearBatchResultsBtn = document.getElementById('clearBatchResults');

        // Smart search with debouncing
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch();
            }, 300);
        });

        // Auto-suggestions
        searchInput.addEventListener('input', showSuggestions);
        searchInput.addEventListener('focus', showSuggestions);
        searchInput.addEventListener('blur', () => {
            setTimeout(() => hideSuggestions(), 200);
        });

        // Filter listeners
        [localizationFilter, omimFilter, synonymFilter, sortBy].forEach(element => {
            element.addEventListener('change', performSearch);
        });

        // Multi-select for localization
        localizationFilter.addEventListener('change', function() {
            updateFilterChips();
        });

        // Batch query
        batchQueryBtn.addEventListener('click', () => {
            const input = batchGenesInput.value.trim();
            if (!input) {
                batchResultsDiv.innerHTML = '<p style="color: red;">Please enter at least one gene name or ID.</p>';
                batchResultsContainer.style.display = 'block';
                clearBatchResultsBtn.style.display = 'inline-block';
                return;
            }
            const queries = input.split(/[\s,\n]+/).filter(q => q.trim()).map(q => q.toLowerCase());
            queries.forEach(query => {
                userStats.recentSearches.push(query);
                localStorage.setItem('recentSearches', JSON.stringify(userStats.recentSearches));
                const searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
                searchCounts[query] = (searchCounts[query] || 0) + 1;
                sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
            });
            updateRecentSearches();
            updatePopularGenes();
            filteredData = geneData.filter(item =>
                queries.some(query =>
                    (item.gene && item.gene.toLowerCase() === query) ||
                    (item.ensembl_id && item.ensembl_id.toLowerCase() === query) ||
                    (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                    (item.omim_id && item.omim_id.toLowerCase() === query)
                )
            );
            if (filteredData.length === 0) {
                batchResultsDiv.innerHTML = '<p>No matching genes found.</p>';
                batchResultsContainer.style.display = 'block';
                clearBatchResultsBtn.style.display = 'inline-block';
                return;
            }
            batchResultsDiv.innerHTML = `
                <table class="results-table">
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
                        ${filteredData.map(item => {
                            const referenceLinks = formatReference(item.reference);
                            return `
                                <tr>
                                    <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank" class="gene-link">${item.gene}</a></td>
                                    <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                                    <td>${item.description || ''}</td>
                                    <td>${item.synonym || ''}</td>
                                    <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                                    <td>${referenceLinks}</td>
                                    <td>${item.localization || ''}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            batchResultsContainer.style.display = 'block';
            clearBatchResultsBtn.style.display = 'inline-block';
        });

        clearBatchResultsBtn.addEventListener('click', () => {
            batchResultsDiv.innerHTML = '';
            batchResultsContainer.style.display = 'none';
            batchGenesInput.value = '';
            clearBatchResultsBtn.style.display = 'none';
            performSearch();
        });
    }

    function performSearch() {
        const query = document.getElementById('smartSearch').value.toLowerCase().trim();
        const localizationFilters = Array.from(document.getElementById('localizationFilter').selectedOptions).map(opt => opt.value);
        const omimRange = document.getElementById('omimFilter').value.trim();
        const synonymFilter = document.getElementById('synonymFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        // Track search
        if (query) {
            userStats.searches++;
            addToRecentSearches(query);
            const searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
            searchCounts[query] = (searchCounts[query] || 0) + 1;
            sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
            updateUserStats();
            updatePopularGenes();
            if (window.gtag) {
                gtag('event', 'search', {
                    event_category: 'CiliaHub',
                    event_label: query
                });
            }
        }

        // Apply filters
        filteredData = geneData.filter(gene => {
            if (query) {
                const searchableText = [
                    gene.gene,
                    gene.ensembl_id,
                    gene.description,
                    gene.synonym,
                    gene.omim_id,
                    gene.localization
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(query)) return false;
            }

            if (localizationFilters.length > 0) {
                const geneLocalization = (gene.localization || '').toLowerCase().replace(/[\s,]+/g, '-');
                if (!localizationFilters.some(filter => geneLocalization.includes(filter))) return false;
            }

            if (omimRange) {
                const [min, max] = omimRange.split('-').map(n => parseInt(n.trim()));
                const omimId = parseInt(gene.omim_id);
                if (min && omimId < min) return false;
                if (max && omimId > max) return false;
            }

            if (synonymFilter === 'yes' && !gene.synonym) return false;
            if (synonymFilter === 'no' && gene.synonym) return false;

            return true;
        });

        // Sort results
        sortResults(sortBy, query);

        // Update display
        updateResultsCount();
        displayResults();
        updateFilterChips();
    }

    function sortResults(sortBy, query = '') {
        filteredData.sort((a, b) => {
            switch (sortBy) {
                case 'gene':
                    return a.gene.localeCompare(b.gene);
                case 'omim':
                    return (parseInt(a.omim_id) || 0) - (parseInt(b.omim_id) || 0);
                case 'localization':
                    return (a.localization || '').localeCompare(b.localization || '');
                case 'relevance':
                default:
                    if (!query) return a.gene.localeCompare(b.gene);
                    const scoreA = calculateRelevanceScore(a, query);
                    const scoreB = calculateRelevanceScore(b, query);
                    return scoreB - scoreA;
            }
        });
    }

    function calculateRelevanceScore(gene, query) {
        let score = 0;
        const q = query.toLowerCase();
        
        if (gene.gene.toLowerCase().includes(q)) score += 10;
        if (gene.gene.toLowerCase().startsWith(q)) score += 5;
        if ((gene.description || '').toLowerCase().includes(q)) score += 3;
        if ((gene.synonym || '').toLowerCase().includes(q)) score += 2;
        if ((gene.ensembl_id || '').toLowerCase().includes(q)) score += 2;
        if ((gene.omim_id || '').toLowerCase().includes(q)) score += 1;
        return score;
    }

    function updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        countElement.textContent = filteredData.length > 0 
            ? `Showing ${filteredData.length} results`
            : 'No results found. Try adjusting your search or filters.';
        document.getElementById('filteredCount').textContent = filteredData.length.toLocaleString();
    }

    function displayResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (filteredData.length === 0) {
            resultsContainer.innerHTML = `
                <div class="loading">
                    <div style="text-align: center; color: #667eea;">
                        <h3>🔬 No results found</h3>
                        <p>Try adjusting your search terms or filters.</p>
                    </div>
                </div>`;
            return;
        }

        if (currentView === 'table') {
            const table = document.createElement('div');
            table.className = 'table-container';
            table.innerHTML = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Gene</th>
                            <th>Ensembl ID</th>
                            <th>Description</th>
                            <th>Synonym</th>
                            <th>OMIM ID</th>
                            <th>Reference</th>
                            <th>Localization</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map(item => {
                            const referenceLinks = formatReference(item.reference);
                            const isBookmarked = userStats.bookmarks.includes(item.gene);
                            return `
                                <tr>
                                    <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank" class="gene-link">${item.gene}</a></td>
                                    <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                                    <td>${item.description || ''}</td>
                                    <td>${item.synonym ? item.synonym.split(',').map(s => s.trim()).join('<br>') : ''}</td>
                                    <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                                    <td>${referenceLinks}</td>
                                    <td>${item.localization || ''}</td>
                                    <td>
                                        <button class="card-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${item.gene}')">⭐</button>
                                        <button class="card-btn" onclick="addToComparison('${item.gene}')">➕ Compare</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            resultsContainer.appendChild(table);
        } else {
            const grid = document.createElement('div');
            grid.className = 'cards-grid';
            grid.innerHTML = filteredData.map(item => {
                const isBookmarked = userStats.bookmarks.includes(item.gene);
                return `
                    <div class="gene-card">
                        <div class="card-header">
                            <div>
                                <div class="gene-name">${item.gene}</div>
                                <div class="gene-id">${item.ensembl_id}</div>
                            </div>
                            <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${item.gene}')">⭐</button>
                        </div>
                        <div class="card-content">
                            <div class="gene-description">${item.description || ''}</div>
                            <div class="gene-details">
                                <div class="detail-item">
                                    <div class="detail-label">OMIM ID</div>
                                    <div class="detail-value"><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Synonyms</div>
                                    <div class="detail-value">${item.synonym || 'None'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Localization</div>
                                    <div class="detail-value">${item.localization || 'N/A'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Reference</div>
                                    <div class="detail-value">${formatReference(item.reference)}</div>
                                </div>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="card-btn" onclick="addToComparison('${item.gene}')">➕ Add to Comparison</button>
                            <a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank" class="card-btn">🔗 View Gene</a>
                        </div>
                    </div>
                `;
            }).join('');
            resultsContainer.appendChild(grid);
        }
    }

    function formatReference(reference) {
        if (!reference) return 'N/A';
        const refs = reference.split(';').map(ref => ref.trim()).filter(ref => ref);
        return refs.map(ref => {
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
        }).join(', ');
    }

    function showSuggestions() {
        const query = document.getElementById('smartSearch').value.toLowerCase().trim();
        const suggestions = document.getElementById('suggestions');
        suggestions.innerHTML = '';

        if (!query) {
            suggestions.style.display = 'none';
            return;
        }

        const suggestionItems = geneData
            .filter(item => item.gene.toLowerCase().includes(query))
            .slice(0, 5)
            .map(item => `
                <div class="suggestion-item" onclick="document.getElementById('smartSearch').value = '${item.gene}'; performSearch(); hideSuggestions();">
                    ${item.gene} (${item.ensembl_id})
                </div>
            `).join('');

        suggestions.innerHTML = suggestionItems;
        suggestions.style.display = suggestionItems ? 'block' : 'none';
    }

    function hideSuggestions() {
        document.getElementById('suggestions').style.display = 'none';
    }

    function updateFilterChips() {
        const filterChips = document.getElementById('filterChips');
        filterChips.innerHTML = '';

        const localizationFilters = Array.from(document.getElementById('localizationFilter').selectedOptions).map(opt => opt.value);
        const omimRange = document.getElementById('omimFilter').value.trim();
        const synonymFilter = document.getElementById('synonymFilter').value;

        localizationFilters.forEach(filter => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `Localization: ${filter} <span class="chip-remove" onclick="removeFilter('localization', '${filter}')">×</span>`;
            filterChips.appendChild(chip);
        });

        if (omimRange) {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `OMIM: ${omimRange} <span class="chip-remove" onclick="removeFilter('omim')">×</span>`;
            filterChips.appendChild(chip);
        }

        if (synonymFilter) {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `Synonym: ${synonymFilter} <span class="chip-remove" onclick="removeFilter('synonym')">×</span>`;
            filterChips.appendChild(chip);
        }
    }

    function removeFilter(type, value) {
        if (type === 'localization') {
            const select = document.getElementById('localizationFilter');
            Array.from(select.options).find(opt => opt.value === value).selected = false;
        } else if (type === 'omim') {
            document.getElementById('omimFilter').value = '';
        } else if (type === 'synonym') {
            document.getElementById('synonymFilter').value = '';
        }
        performSearch();
    }

    function clearAllFilters() {
        document.getElementById('smartSearch').value = '';
        document.getElementById('localizationFilter').selectedIndex = -1;
        document.getElementById('omimFilter').value = '';
        document.getElementById('synonymFilter').value = '';
        filteredData = [];
        updateFilterChips();
        updateResultsCount();
        displayResults();
    }

    function toggleBookmark(gene) {
        const index = userStats.bookmarks.indexOf(gene);
        if (index === -1) {
            userStats.bookmarks.push(gene);
        } else {
            userStats.bookmarks.splice(index, 1);
        }
        localStorage.setItem('bookmarks', JSON.stringify(userStats.bookmarks));
        updateUserStats();
        displayResults();
    }

    function showBookmarks() {
        filteredData = geneData.filter(item => userStats.bookmarks.includes(item.gene));
        updateResultsCount();
        displayResults();
    }

    function addToRecentSearches(query) {
        if (!userStats.recentSearches.includes(query)) {
            userStats.recentSearches.unshift(query);
            if (userStats.recentSearches.length > 5) {
                userStats.recentSearches.pop();
            }
            localStorage.setItem('recentSearches', JSON.stringify(userStats.recentSearches));
        }
        updateRecentSearches();
    }

    function updateRecentSearches() {
        const recentSearches = document.getElementById('recentSearches');
        recentSearches.innerHTML = userStats.recentSearches.map(search => `
            <div class="recent-search-item" onclick="document.getElementById('smartSearch').value = '${search}'; performSearch();">
                ${search}
            </div>
        `).join('');
    }

    function updatePopularGenes() {
        const popularGenesList = document.getElementById('popularGenesList');
        const searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
        const sortedGenes = Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        popularGenesList.innerHTML = sortedGenes.length
            ? sortedGenes.map(([gene, count]) => `<div class="recent-search-item" onclick="document.getElementById('smartSearch').value = '${gene}'; performSearch();">${gene} (${count} searches)</div>`).join('')
            : '<div class="recent-search-item">No searches yet.</div>';
    }

    function updateUserStats() {
        document.getElementById('searchCount').textContent = userStats.searches;
        document.getElementById('bookmarkCount').textContent = userStats.bookmarks.length;
        updateRecentSearches();
    }

    function toggleComparison() {
        const panel = document.getElementById('comparisonPanel');
        panel.classList.toggle('open');
        updateComparisonPanel();
    }

    function addToComparison(gene) {
        if (!comparisonGenes.includes(gene)) {
            comparisonGenes.push(gene);
            document.getElementById('compareCount').textContent = comparisonGenes.length;
            updateComparisonPanel();
        }
    }

    function updateComparisonPanel() {
        const comparisonContent = document.getElementById('comparisonContent');
        if (comparisonGenes.length === 0) {
            comparisonContent.innerHTML = `
                <p style="color: #666; text-align: center; margin-top: 50px;">
                    Select genes from the results to add them to comparison
                </p>`;
            return;
        }

        comparisonContent.innerHTML = comparisonGenes.map(gene => {
            const item = geneData.find(g => g.gene === gene);
            return `
                <div class="compared-gene">
                    <div class="gene-name">${item.gene}</div>
                    <div class="gene-id">${item.ensembl_id}</div>
                    <div class="gene-description">${item.description || ''}</div>
                    <button class="remove-comparison" onclick="removeFromComparison('${item.gene}')">×</button>
                </div>
            `;
        }).join('');
    }

    function removeFromComparison(gene) {
        comparisonGenes = comparisonGenes.filter(g => g !== gene);
        document.getElementById('compareCount').textContent = comparisonGenes.length;
        updateComparisonPanel();
    }

    function exportResults() {
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
        a.download = 'ciliahub_data.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        if (window.gtag) {
            gtag('event', 'export', {
                event_category: 'CiliaHub',
                event_label: 'CSV Export'
            });
        }
    }

    function shareSearch() {
        const query = document.getElementById('smartSearch').value;
        const localization = Array.from(document.getElementById('localizationFilter').selectedOptions).map(opt => opt.value).join(',');
        const omim = document.getElementById('omimFilter').value;
        const synonym = document.getElementById('synonymFilter').value;
        const sort = document.getElementById('sortBy').value;

        const params = new URLSearchParams({
            query, localization, omim, synonym, sort
        }).toString();

        const shareUrl = `${window.location.origin}${window.location.pathname}#ciliahub?${params}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Search URL copied to clipboard!');
        });
    }

    function switchView(view) {
        currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.view-btn[onclick="switchView('${view}')"]`).classList.add('active');
        displayResults();
    }

    // Initialize the application
    initializeApp();
    setupEventListeners();
}
