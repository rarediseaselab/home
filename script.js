<script>
    document.addEventListener('DOMContentLoaded', function() {
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

        const lightbox = document.getElementById('lightbox');
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxLinks = document.querySelectorAll('.lightbox-link');
        const closeBtn = document.querySelector('.lightbox-close');

        lightboxLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                if (lightboxImage) {
                    lightboxImage.src = this.href;
                    if (lightbox) lightbox.style.display = 'flex';
                }
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                if (lightbox) lightbox.style.display = 'none';
            });
        }

        if (lightbox) {
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    lightbox.style.display = 'none';
                }
            });
        }

        const backToTopBtn = document.getElementById('back-to-top');
        if (backToTopBtn) {
            window.addEventListener('scroll', function() {
                backToTopBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
            });

            backToTopBtn.addEventListener('click', function() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        const nightModeToggle = document.getElementById('night-mode-toggle');
        if (nightModeToggle) {
            if (localStorage.getItem('nightMode') === 'enabled') {
                document.body.classList.add('night-mode');
            }
            nightModeToggle.addEventListener('click', function() {
                document.body.classList.toggle('night-mode');
                localStorage.setItem('nightMode', document.body.classList.contains('night-mode') ? 'enabled' : 'disabled');
            });
        }

        // Smart Search with Auto-suggestions for CiliaHub
        async function loadCiliaHubData() {
            const tableBody = document.getElementById('ciliahub-table-body');
            const searchInput = document.getElementById('ciliahub-search');
            const filterSelect = document.getElementById('ciliahub-filter');
            const resetBtn = document.getElementById('ciliahub-reset');
            const downloadBtn = document.getElementById('download-ciliahub');
            const batchQueryBtn = document.getElementById('batchQueryBtn');
            const batchGenesInput = document.getElementById('batchGenes');
            const batchResultsDiv = document.getElementById('batchResults');
            const batchResultsContainer = document.getElementById('batchResultsContainer');
            const clearBatchResultsBtn = document.getElementById('clearBatchResults');
            const popularGenesList = document.getElementById('popularGenesList');
            const errorDiv = document.getElementById('ciliahub-error');
            const loadingDiv = document.getElementById('ciliahub-loading');
            const table = document.querySelector('.ciliahub-table');
            const suggestions = document.getElementById('suggestions');

            let data = [];
            let searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
            let debounceTimeout;

            function showError(message) {
                if (errorDiv) {
                    errorDiv.textContent = message;
                    errorDiv.style.display = 'block';
                }
                if (loadingDiv) loadingDiv.style.display = 'none';
                if (table) table.style.display = 'none';
            }

            function hideError() {
                if (errorDiv) errorDiv.style.display = 'none';
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

            function populateTable(filteredData = []) {
                if (!tableBody) return;
                tableBody.innerHTML = '';

                if (filteredData.length === 0) {
                    if (loadingDiv) loadingDiv.style.display = 'none';
                    if (table) table.style.display = 'none';
                    return;
                }

                filteredData.forEach(item => {
                    const sanitizedLocalization = (item.localization || '')
                        .toLowerCase()
                        .replace(/[\s,]+/g, '-');

                    const referenceLinks = formatReference(item.reference);
                    const synonyms = item.synonym ? item.synonym.split(',').map(s => s.trim()).join('<br>') : '';

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene || ''}" target="_blank">${item.gene || ''}</a></td>
                        <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id || ''}" target="_blank">${item.ensembl_id || ''}</a></td>
                        <td class="description" data-full-text="${item.description || ''}">${item.description || ''}</td>
                        <td>${synonyms}</td>
                        <td><a href="https://www.omim.org/entry/${item.omim_id || ''}" target="_blank">${item.omim_id || ''}</a></td>
                        <td class="reference" data-tooltip="${item.reference || ''}">${referenceLinks}</td>
                        <td>${item.localization || ''}</td>
                    `;
                    if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
                    tableBody.appendChild(row);
                });

                if (loadingDiv) loadingDiv.style.display = 'none';
                if (table) table.style.display = 'table';
            }

            function updatePopularGenes() {
                if (!popularGenesList) return;
                const sortedGenes = Object.entries(searchCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                popularGenesList.innerHTML = sortedGenes.length
                    ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
                    : '<li>No searches yet.</li>';
            }

            function showSearchPrompt() {
                if (loadingDiv) {
                    loadingDiv.innerHTML = 'Enter a search term to explore the CiliaHub database...';
                    loadingDiv.style.display = 'block';
                }
                if (table) table.style.display = 'none';
            }

            function showSuggestions() {
                if (!searchInput || !suggestions) return;
                const query = searchInput.value.toLowerCase().trim();
                suggestions.innerHTML = '';
                if (query.length < 2) {
                    suggestions.style.display = 'none';
                    return;
                }

                const filteredGenes = data.filter(item => {
                    const searchableText = [
                        item.gene || '',
                        item.ensembl_id || '',
                        item.description || '',
                        item.synonym || '',
                        item.omim_id || '',
                        item.localization || ''
                    ].join(' ').toLowerCase();
                    return searchableText.includes(query);
                });

                filteredGenes.slice(0, 5).forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = `${item.gene || ''} (${item.ensembl_id || ''})`;
                    div.addEventListener('click', () => {
                        searchInput.value = item.gene || '';
                        suggestions.style.display = 'none';
                        const filteredData = data.filter(d =>
                            (d.gene && d.gene.toLowerCase().includes(item.gene.toLowerCase())) ||
                            (d.ensembl_id && d.ensembl_id.toLowerCase().includes(item.gene.toLowerCase())) ||
                            (d.synonym && d.synonym.toLowerCase().includes(item.gene.toLowerCase())) ||
                            (d.omim_id && d.omim_id.toLowerCase().includes(item.gene.toLowerCase()))
                        );
                        populateTable(filteredData);
                    });
                    suggestions.appendChild(div);
                });

                suggestions.style.display = filteredGenes.length > 0 ? 'block' : 'none';
            }

            function hideSuggestions() {
                if (suggestions) {
                    suggestions.style.display = 'none';
                }
            }

            function debounce(func, wait) {
                return function (...args) {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => func.apply(this, args), wait);
                };
            }

            try {
                const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
                console.log('Loaded entries:', data.length);

                showSearchPrompt();
                updatePopularGenes();
            } catch (error) {
                console.error('Error loading CiliaHub data:', error);
                showError('Failed to load CiliaHub data. Please check your network or contact support.');
                return;
            }

            if (searchInput) {
                searchInput.addEventListener('input', debounce(() => {
                    hideError();
                    showSuggestions();
                    const query = searchInput.value.toLowerCase().trim();

                    if (!query) {
                        showSearchPrompt();
                        return;
                    }

                    searchCounts[query] = (searchCounts[query] || 0) + 1;
                    sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
                    updatePopularGenes();

                    const filteredData = data.filter(item =>
                        (item.gene && item.gene.toLowerCase().includes(query)) ||
                        (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                        (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                        (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                        (item.reference && item.reference.toLowerCase().includes(query))
                    );

                    populateTable(filteredData);
                }, 300));

                searchInput.addEventListener('focus', showSuggestions);
                searchInput.addEventListener('blur', () => {
                    setTimeout(hideSuggestions, 200);
                });
            }

            if (filterSelect) {
                filterSelect.addEventListener('change', () => {
                    hideError();
                    const filterValue = filterSelect.value.toLowerCase();
                    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

                    if (!query && !filterValue) {
                        showSearchPrompt();
                        return;
                    }

                    let filteredData = data;

                    if (query) {
                        filteredData = filteredData.filter(item =>
                            (item.gene && item.gene.toLowerCase().includes(query)) ||
                            (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                            (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                            (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                            (item.reference && item.reference.toLowerCase().includes(query))
                        );
                    }

                    if (filterValue) {
                        filteredData = filteredData.filter(item =>
                            (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
                        );
                    }

                    populateTable(filteredData);
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    hideError();
                    if (searchInput) searchInput.value = '';
                    if (filterSelect) filterSelect.value = '';
                    searchCounts = {};
                    sessionStorage.removeItem('popularGenes');
                    updatePopularGenes();
                    showSearchPrompt();
                    if (suggestions) suggestions.style.display = 'none';
                });
            }

            if (downloadBtn) {
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
            }

            if (batchQueryBtn && batchGenesInput && batchResultsDiv && batchResultsContainer) {
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
                    const filteredData = data.filter(item =>
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
                                ${filteredData.map(item => {
                                    const referenceLinks = formatReference(item.reference);
                                    return `
                                        <tr>
                                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene || ''}" target="_blank">${item.gene || ''}</a></td>
                                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id || ''}" target="_blank">${item.ensembl_id || ''}</a></td>
                                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.description || ''}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.synonym || ''}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="https://www.omim.org/entry/${item.omim_id || ''}" target="_blank">${item.omim_id || ''}</a></td>
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
            }

            if (clearBatchResultsBtn) {
                clearBatchResultsBtn.addEventListener('click', () => {
                    if (batchResultsDiv) batchResultsDiv.innerHTML = '';
                    if (batchResultsContainer) batchResultsContainer.style.display = 'none';
                    if (batchGenesInput) batchGenesInput.value = '';
                });
            }
        }

        // Initialize CiliaHub only when the section is shown
        function initializeCiliaHub() {
            if (document.getElementById('ciliahub')) {
                loadCiliaHubData();
            }
        }

        // Override showSection to initialize CiliaHub when section is shown
        const originalShowSection = showSection;
        showSection = function(sectionId) {
            originalShowSection(sectionId);
            if (sectionId === 'ciliahub') {
                initializeCiliaHub();
            }
        };

        // Initial load: only initialize if ciliahub is the active section
        if (document.getElementById('ciliahub').style.display === 'block') {
            initializeCiliaHub();
        }
    });
</script>
