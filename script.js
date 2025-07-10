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
        const batchQueryBtn = document.getElementById('batchQueryBtn');
        const batchGenesInput = document.getElementById('batchGenes');
        const batchResultsDiv = document.getElementById('batchResults');
        const batchResultsContainer = document.getElementById('batchResultsContainer');
        const clearBatchResultsBtn = document.getElementById('clearBatchResults');

        let searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};

        function populateTable(filteredData = data) {
            tableBody.innerHTML = '';
            filteredData.forEach(item => {
                const sanitizedLocalization = (item.localization || '')
                    .toLowerCase()
                    .replace(/[\s,]+/g, '-');

                const pmids = (item.reference || '')
                    .split(';')
                    .map(pmid => pmid.trim())
                    .filter(pmid => pmid);

                const referenceLinks = pmids.length
                    ? pmids.map(pmid => `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}/" target="_blank">${pmid}</a>`).join(', ')
                    : 'N/A';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                    <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                    <td>${item.description || ''}</td>
                    <td>${item.synonym || ''}</td>
                    <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                    <td>${referenceLinks}</td>
                    <td>${item.localization || ''}</td>
                `;
                if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
                tableBody.appendChild(row);
            });
        }

        function updatePopularGenes() {
            const popularGenesList = document.getElementById('popularGenesList');
            const sortedGenes = Object.entries(searchCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            popularGenesList.innerHTML = sortedGenes.length
                ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
                : '<li>No searches yet.</li>';
        }

        populateTable(data);
        updatePopularGenes();

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (query) {
                searchCounts[query] = (searchCounts[query] || 0) + 1;
                sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
                updatePopularGenes();
            }
            const filteredData = data.filter(item =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                (item.reference && item.reference.toLowerCase().includes(query))
            );
            populateTable(filteredData);
        });

        filterSelect.addEventListener('change', () => {
            const filterValue = filterSelect.value.toLowerCase();
            const filteredData = filterValue
                ? data.filter(item =>
                    (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
                )
                : data;
            populateTable(filteredData);
        });

        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = '';
            searchCounts = {};
            sessionStorage.removeItem('popularGenes');
            updatePopularGenes();
            populateTable(data);
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
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ciliahub_data.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        });

        batchQueryBtn.addEventListener('click', () => {
            const input = batchGenesInput.value.trim();
            if (!input) {
                batchResultsDiv.innerHTML = '<p>Please enter at least one gene name or ID.</p>';
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
                            <th style="padding: 10px;">Gene</th>
                            <th style="padding: 10px;">Ensembl ID</th>
                            <th style="padding: 10px;">Description</th>
                            <th style="padding: 10px;">Synonym</th>
                            <th style="padding: 10px;">OMIM ID</th>
                            <th style="padding: 10px;">Reference</th>
                            <th style="padding: 10px;">Localization</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map(item => {
                            const pmids = (item.reference || '').split(';').map(pmid => pmid.trim()).filter(pmid => pmid);
                            const referenceLinks = pmids.length
                                ? pmids.map(pmid => `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}/" target="_blank">${pmid}</a>`).join(', ')
                                : 'N/A';
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

    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        document.getElementById('ciliahub-table-body').innerHTML = `<tr><td colspan="7">Error loading data: ${error.message}</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', loadCiliaHubData);
