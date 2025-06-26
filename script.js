async function loadCiliaHubData() {
    try {
        const response = await fetch('/ciliahub_data.json'); // Change to '/home/ciliahub_data.json' if needed
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for /ciliahub_data.json`);
        }
        const data = await response.json();
        const tableBody = document.getElementById('ciliahub-table-body');
        const searchInput = document.getElementById('ciliahub-search');
        const filterSelect = document.getElementById('ciliahub-filter');
        const resetBtn = document.getElementById('ciliahub-reset');
        const downloadBtn = document.getElementById('download-ciliahub');

        // Function to populate table
        function populateTable(filteredData = data) {
            tableBody.innerHTML = '';
            filteredData.forEach(item => {
                const sanitizedLocalization = (item.localization || '')
                    .toLowerCase()
                    .replace(/[\s,]+/g, '-'); // Replace spaces and commas with hyphens
                // Split reference into individual PMIDs and create links
                const pmids = (item.reference || '').split(';').map(pmid => pmid.trim()).filter(pmid => pmid);
                const referenceLinks = pmids.length > 0
                    ? pmids.map(pmid => `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}/" target="_blank">${pmid}</a>`).join(', ')
                    : 'N/A';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene || ''}" target="_blank">${item.gene || ''}</a></td>
                    <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id || ''}" target="_blank">${item.ensembl_id || ''}</a></td>
                    <td>${item.description || ''}</td>
                    <td>${item.synonym || ''}</td>
                    <td><a href="https://www.omim.org/entry/${item.omim_id || ''}" target="_blank">${item.omim_id || ''}</a></td>
                    <td>${referenceLinks}</td>
                    <td>${item.localization || ''}</td>
                `;
                if (sanitizedLocalization) {
                    row.classList.add(sanitizedLocalization);
                }
                tableBody.appendChild(row);
            });
        }

        // Initial population
        populateTable();

        // Search functionality
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filteredData = data.filter(item =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                (item.reference && item.reference.toLowerCase().includes(query))
            );
            populateTable(filteredData);
        });

        // Filter functionality
        filterSelect.addEventListener('change', () => {
            const filterValue = filterSelect.value.toLowerCase();
            let filteredData = data;
            if (filterValue) {
                filteredData = data.filter(item => 
                    (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
                );
            }
            populateTable(filteredData);
        });

        // Reset functionality
        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = '';
            populateTable(data);
        });

        // Download functionality
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
            ].map(row => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ciliahub_data.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        document.getElementById('ciliahub-table-body').innerHTML = '<tr><td colspan="7">Error loading data. Check the console or ensure ciliahub_data.json is accessible at /ciliahub_data.json. Status: ' + error.message + '</td></tr>';
    }
}
