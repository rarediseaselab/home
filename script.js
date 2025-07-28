async function loadCiliaHubData() {
    const tableBody = document.getElementById('ciliahub-table-body');
    const searchInput = document.getElementById('ciliahub-search');
    const searchBtn = document.getElementById('ciliahub-search-btn');
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
    const totalGenesSpan = document.getElementById('total-genes');

    let data = [];
    let searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
    let sortColumn = null;
    let sortDirection = 'asc';

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
        return refs.map(ref => {
            if (/^\d+$/.test(ref)) {
                return `<a href="https://pubmed.ncbi.nlm.nih.gov/${ref}/" target="_blank">${ref}</a>`;
            } else if (ref.startsWith('https://doi.org/') || /^10\.\d{4,}/.test(ref)) {
                const doi = ref.startsWith('https://doi.org/') ? ref.replace('https://doi.org/', '') : ref;
                return `<a href="https://doi.org/${doi}" target="_blank">${doi}</a>`;
            } else if (ref.startsWith('http://') || ref.startsWith('https://')) {
                return `<a href="${ref}" target="_blank">${ref}</a>`;
            } else {
                return ref;
            }
        }).join(', ');
    }

    function populateTable(filteredData = data) {
        tableBody.innerHTML = '';
        filteredData.forEach(item => {
            const sanitizedLocalization = (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-');
            const referenceLinks = formatReference(item.reference);
            const synonyms = item.synonym ? item.synonym.split(',').map(s => s.trim()).join('<br>') : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                <td>${item.description || ''}</td>
                <td>${synonyms}</td>
                <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                <td>${referenceLinks}</td>
                <td>${item.localization || ''}</td>
            `;
            if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
            tableBody.appendChild(row);
        });
        loadingDiv.style.display = 'none';
        table.style.display = 'table';
    }

    function updatePopularGenes() {
        const sortedGenes = Object.entries(searchCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        popularGenesList.innerHTML = sortedGenes.length
            ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
            : '<li>No searches yet.</li>';
    }

    function sortData(column, direction) {
        const sortedData = [...data].sort((a, b) => {
            const valA = (a[column] || '').toString().toLowerCase();
            const valB = (b[column] || '').toString().toLowerCase();
            if (direction === 'asc') {
                return valA.localeCompare(valB);
            } else {
                return valB.localeCompare(valA);
            }
        });
        populateTable(sortedData);
    }

    try {
        const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
        data = await response.json();
        totalGenesSpan.textContent = data.length;
        populateTable();
        updatePopularGenes();
    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        showError('Failed to load CiliaHub data. Please check your network or contact support.');
        return;
    }

    searchBtn.addEventListener('click', () => {
        hideError();
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
        hideError();
        const filterValue = filterSelect.value.toLowerCase();
        const filteredData = filterValue
            ? data.filter(item =>
                (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
            )
            : data;
        populateTable(filteredData);
    });

    resetBtn.addEventListener('click', () => {
        hideError();
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
        ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ciliahub_data.csv';
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
                    <tr style="background-color: #004080; color: white;">
                        <th style="padding: 12px;">Gene</th>
                        <th style="padding: 12px;">Ensembl ID</th>
                        <th style="padding: 12px;">Description</th>
                        <th style="padding: 12px;">Synonym</th>
                        <th style="padding: 12px;">OMIM ID</th>
                        <th style="padding: 12px;">Reference</th>
                        <th style="padding: 12px;">Localization</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => {
                        const referenceLinks = formatReference(item.reference);
                        return `
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;"><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;"><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.description || ''}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.synonym || ''}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;"><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${referenceLinks}</td>
                                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.localization || ''}</td>
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

    // Table Sorting
    document.querySelectorAll('.ciliahub-table th').forEach((header, index) => {
        header.addEventListener('click', () => {
            const columns = ['gene', 'ensembl_id', 'description', 'synonym', 'omim_id', 'reference', 'localization'];
            const column = columns[index];
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            sortData(column, sortDirection);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ciliahub')) {
        loadCiliaHubData();
    }
});
