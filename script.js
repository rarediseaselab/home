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
@@ -49,6 +97,9 @@
            return row;
        }

        // -------------------------------
        // Populate main table
        // -------------------------------
        function populateTable(filteredData = data) {
            tableBody.innerHTML = '';
            filteredData.forEach(item => {
@@ -59,9 +110,17 @@

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
@@ -70,6 +129,9 @@
                (item.reference && item.reference.toLowerCase().includes(query))
            );
            populateTable(filteredData);

            // Increment count for matched genes
            filteredData.forEach(item => incrementGeneCount(item.gene));
        });

        // Filter event
@@ -114,7 +176,9 @@
            window.URL.revokeObjectURL(url);
        });

        // -------------------------------
        // Batch Query event
        // -------------------------------
        batchQueryBtn.addEventListener('click', () => {
            const rawInput = batchTextarea.value.trim();
            if (!rawInput) {
@@ -144,6 +208,11 @@
                );
            });

            // Increment count for matched genes (usage stats)
            if (matched.length) {Add commentMore actions
                matched.forEach(item => incrementGeneCount(item.gene));
            }

            // Show results or no match message
            if (!matched.length) {
                batchResultsDiv.innerHTML = '<p>No matching entries found for the given batch query.</p>';
@@ -184,6 +253,7 @@
            batchTextarea.value = '';
        });

        // Clear batch query results button
        clearBatchResultsBtn.addEventListener('click', () => {
            batchResultsContainer.style.display = 'none';
            batchResultsDiv.innerHTML = '';
