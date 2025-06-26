async function loadCiliaHubData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const data = JSON.parse(text);
        console.log('Loaded entries:', data.length);

        const tableBody = document.getElementById('ciliahub-table-body');
        const searchInput = document.getElementById('ciliahub-search');
        const filterSelect = document.getElementById('ciliahub-filter');
        const resetBtn = document.getElementById('ciliahub-reset');
        const downloadBtn = document.getElementById('download-ciliahub');

        // Batch Query elements
        const batchTextarea = document.getElementById('batchGenes');
        const batchQueryBtn = document.getElementById('batchQueryBtn');
        const batchResultsContainer = document.getElementById('batchResultsContainer');
        const batchResultsDiv = document.getElementById('batchResults');
        const clearBatchResultsBtn = document.getElementById('clearBatchResults');

        // -------------------------------
        // Usage Statistics / Popular Genes Feature
        // -------------------------------

        // Store gene search counts here
        const geneSearchCounts = {};

        // Load previous counts from localStorage (optional)
        const savedCounts = localStorage.getItem('ciliahubGeneSearchCounts');
        if (savedCounts) {
            Object.assign(geneSearchCounts, JSON.parse(savedCounts));
        }

        // Update Popular Genes UI function
        function updatePopularGenesUI() {
            const popularGenesList = document.getElementById('popularGenesList');
            if (!popularGenesList) return;  // safety check

            const sortedGenes = Object.entries(geneSearchCounts)
                .sort((a, b) => b[1] - a[1])  // descending order
                .slice(0, 10); // top 10

            if (sortedGenes.length === 0) {
                popularGenesList.innerHTML = '<li>No searches yet.</li>';
                return;
            }

            popularGenesList.innerHTML = sortedGenes.map(([gene, count]) =>
                `<li><strong>${gene}</strong> — searched ${count} time${count > 1 ? 's' : ''}</li>`
            ).join('');
        }

        // Increment gene count and update UI & localStorage
        function incrementGeneCount(gene) {
            if (!gene) return;
            const g = gene.toUpperCase();
            geneSearchCounts[g] = (geneSearchCounts[g] || 0) + 1;
            updatePopularGenesUI();
            localStorage.setItem('ciliahubGeneSearchCounts', JSON.stringify(geneSearchCounts));
        }

        // Initial UI update
        updatePopularGenesUI();

        // -------------------------------
        // Helper functions for table rows and reference links
        // -------------------------------

        function sanitizeLocalization(localization) {
            return (localization || '').toLowerCase().replace(/[\s,]+/g, '-');
        }

        function makeReferenceLinks(refStr) {
            const pmids = (refStr || '').split(';').map(p => p.trim()).filter(Boolean);
            return pmids.length
                ? pmids.map(pmid => `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}/" target="_blank" rel="noopener noreferrer">${pmid}</a>`).join(', ')
                : 'N/A';
        }

        function createTableRow(item) {
            const sanitizedLocalization = sanitizeLocalization(item.localization);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(item.gene)}" target="_blank" rel="noopener noreferrer">${item.gene}</a></td>
                <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(item.ensembl_id)}" target="_blank" rel="noopener noreferrer">${item.ensembl_id}</a></td>
                <td>${item.description || ''}</td>
                <td>${item.synonym || ''}</td>
                <td><a href="https://www.omim.org/entry/${encodeURIComponent(item.omim_id)}" target="_blank" rel="noopener noreferrer">${item.omim_id}</a></td>
                <td>${makeReferenceLinks(item.reference)}</td>
                <td>${item.localization || ''}</td>
            `;
            if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
            return row;
        }

        // -------------------------------
        // Populate main table
        // -------------------------------
        function populateTable(filteredData = data) {
            tableBody.innerHTML = '';
            filteredData.forEach(item => {
                const row = createTableRow(item);
                tableBody.appendChild(row);
            });
        }

        populateTable(data);

        // -------------------------------
        // Event listeners
        // -------------------------------

        // Search event
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                populateTable(data);
                return;
            }
            const filteredData = data.filter(item =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                (item.reference && item.reference.toLowerCase().includes(query))
            );
            populateTable(filteredData);

            // Increment count for matched genes
            filteredData.forEach(item => incrementGeneCount(item.gene));
        });

        // Filter event
        filterSelect.addEventListener('change', () => {
            const filterValue = filterSelect.value.toLowerCase();
            const filteredData = filterValue
                ? data.filter(item =>
                    sanitizeLocalization(item.localization) === filterValue
                )
                : data;
            populateTable(filteredData);
        });

        // Reset button
        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = '';
            populateTable(data);
        });

        // Download CSV
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
            ].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ciliahub_data.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        });

        // -------------------------------
        // Batch Query event
        // -------------------------------
        batchQueryBtn.addEventListener('click', () => {
            const rawInput = batchTextarea.value.trim();
            if (!rawInput) {
                alert('Please enter at least one gene name or ID for batch query.');
                return;
            }

            // Split input by comma, space, or newline and normalize to uppercase
            const queryGenes = rawInput.split(/[\s,]+/).map(g => g.trim().toUpperCase()).filter(Boolean);

            if (queryGenes.length > 100) {
                alert('Please limit batch query to 100 genes or fewer.');
                return;
            }

            // Filter data for matching genes or IDs (gene, ensembl_id, synonym, omim_id)
            const matched = data.filter(item => {
                const geneUpper = item.gene?.toUpperCase() || '';
                const ensemblUpper = item.ensembl_id?.toUpperCase() || '';
                const synonymUpper = item.synonym?.toUpperCase() || '';
                const omimUpper = item.omim_id?.toUpperCase() || '';
                return queryGenes.some(q =>
                    q === geneUpper ||
                    q === ensemblUpper ||
                    q === synonymUpper ||
                    q === omimUpper
                );
            });

            // Increment count for matched genes (usage stats)
            if (matched.length) {
                matched.forEach(item => incrementGeneCount(item.gene));
            }

            // Show results or no match message
            if (!matched.length) {
                batchResultsDiv.innerHTML = '<p>No matching entries found for the given batch query.</p>';
            } else {
                // Create results table
                let html = `<table class="ciliahub-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead style="background-color: #203c78; color: white;">
                        <tr>
                            <th>Gene</th>
                            <th>Ensembl ID</th>
                            <th>Gene Description</th>
                            <th>Synonym</th>
                            <th>OMIM ID</th>
                            <th>Reference</th>
                            <th>Ciliary Localization</th>
                        </tr>
                    </thead>
                    <tbody>`;

                matched.forEach(item => {
                    html += `
                        <tr>
                            <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(item.gene)}" target="_blank" rel="noopener noreferrer">${item.gene}</a></td>
                            <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(item.ensembl_id)}" target="_blank" rel="noopener noreferrer">${item.ensembl_id}</a></td>
                            <td>${item.description || ''}</td>
                            <td>${item.synonym || ''}</td>
                            <td><a href="https://www.omim.org/entry/${encodeURIComponent(item.omim_id)}" target="_blank" rel="noopener noreferrer">${item.omim_id}</a></td>
                            <td>${makeReferenceLinks(item.reference)}</td>
                            <td>${item.localization || ''}</td>
                        </tr>`;
                });

                html += '</tbody></table>';
                batchResultsDiv.innerHTML = html;
            }

            batchResultsContainer.style.display = 'block';
            batchTextarea.value = '';
        });

        // Clear batch query results button
        clearBatchResultsBtn.addEventListener('click', () => {
            batchResultsContainer.style.display = 'none';
            batchResultsDiv.innerHTML = '';
        });

    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        document.getElementById('ciliahub-table-body').innerHTML = `<tr><td colspan="7">Error loading data: ${error.message}</td></tr>`;
    }
}

// Run after DOM is loaded
document.addEventListener('DOMContentLoaded', loadCiliaHubData);
