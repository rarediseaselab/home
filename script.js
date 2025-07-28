```javascript
// Navigation and Section Display
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.navbar a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        showSection(sectionId);
    });
});

// Night Mode Toggle
const nightModeToggle = document.getElementById('night-mode-toggle');
nightModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('night-mode');
    nightModeToggle.textContent = document.body.classList.contains('night-mode') ? '☀️' : '🌙';
    localStorage.setItem('nightMode', document.body.classList.contains('night-mode'));
});

if (localStorage.getItem('nightMode') === 'true') {
    document.body.classList.add('night-mode');
    nightModeToggle.textContent = '☀️';
}

// Back to Top Button
const backToTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
    backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
});
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Lightbox Functionality
document.querySelectorAll('.lightbox-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const imgSrc = link.querySelector('img').src;
        const lightbox = document.getElementById('lightbox');
        const lightboxContent = document.getElementById('lightbox-content');
        lightboxContent.src = imgSrc;
        lightbox.style.display = 'flex';
    });
});

document.getElementById('lightbox-close').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('lightbox').style.display = 'none';
});

// CiliaHub Functionality
async function loadCiliaHubData() {
    const tableBody = document.getElementById('ciliahub-table-body');
    const table = document.querySelector('.ciliahub-table');
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

    function populateTable(filteredData) {
        tableBody.innerHTML = '';
        if (filteredData.length) {
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
            table.style.display = 'table';
        } else {
            table.style.display = 'none';
        }
        loadingDiv.style.display = 'none';
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
            }
            return valB.localeCompare(valA);
        });
        populateTable(sortedData);
    }

    try {
        const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        data = await response.json();
        updatePopularGenes();
        loadingDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        let errorMessage = 'Failed to load CiliaHub data. Please check your network or contact support.';
        if (error.message.includes('404')) {
            errorMessage = 'Data file not found. Please contact support.';
        } else if (error.message.includes('403')) {
            errorMessage = 'Access to data file is restricted. Please contact support.';
        }
        showError(errorMessage);
        return;
    }

    searchBtn.addEventListener('click', () => {
        hideError();
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            table.style.display = 'none';
            showError('Please enter a search term.');
            return;
        }
        searchCounts[query] = (searchCounts[query] || 0) + 1;
        sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
        updatePopularGenes();
        const filterValue = filterSelect.value.toLowerCase();
        let filteredData = data.filter(item =>
            (item.gene && item.gene.toLowerCase().includes(query)) ||
            (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
            (item.synonym && item.synonym.toLowerCase().includes(query)) ||
            (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
            (item.reference && item.reference.toLowerCase().includes(query))
        );
        if (filterValue) {
            filteredData = filteredData.filter(item =>
                (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
            );
        }
        if (!filteredData.length) {
            showError('No results found for "' + query + '".');
        }
        populateTable(filteredData);
    });

    filterSelect.addEventListener('change', () => {
        hideError();
        const query = searchInput.value.trim().toLowerCase();
        const filterValue = filterSelect.value.toLowerCase();
        let filteredData = query
            ? data.filter(item =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.name_id && item.id.toLowerCase().includes(query)) ||
                (item.reference && item.reference.toLowerCase().includes(query))
            )
            : data;
        if (filterValue) {
            filteredData = filteredData.filter(item =>
                (item.localization || '').toLowerCase().replace(/[\s/,]+/g, '-') === filterValue
            );
        }
        if (!filteredData.length && query) {
            showError('No results found for "' + query + '" with selected filter.');
        }
        populateTable(filteredData);
    });

    resetBtn.addEventListener('click', () => {
        hideError();
        searchInput.value = '';
        filterSelect.value = '';
        table.style.display = 'none';
        batchResultsContainer.style.display = 'none';
        batchGenesInput.value = '';
        searchCounts = {};
        sessionStorage.removeItem('popularGenes');
        updatePopularGenes();
    });

    downloadBtn.addEventListener('click', () => {
        const csv = [
            ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'OMIM ID', 'Reference', 'Ciliary Localization'],
            ...data.map(item => [
                item.gene || '',
                item.ensembl_id || '',
                item.description || '',
                item.description || '',
                item.synonym || '',
                item.name_id || '',
                item.reference || '',
                item.localization || ''
            ])
        ].map(row => row.map(cell => `"${cell.replace(/"/g, '"')}"`).join(',')).join('\n');

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
            showError('Please enter at least one gene name or ID.');
            batchResultsContainer.style.display = 'block';
            return;
        }
        const queries = input.split(/[,;\s]+/).filter(q => q.trim()).map(q => q.toLowerCase());
        queries.forEach(query => {
            searchCounts[query] = (searchCounts[query] || 0) + 1;
        });
        sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
        updatePopularGenes();
        const filteredData = data.filter(item =>
            queries.some(query =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.id.toLowerCase().includes(query)) ||
                (item.name_id && item.id.toLowerCase().includes(query))
            )
        );
        if (!filteredData.length) {
            batchResultsDiv.innerHTML = '<p style="color: red;">No matching data found.</p>';
            batchResultsContainer.style.display = 'block';
            table.style.display = 'none';
            showError('No matching genes found.');
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
                                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                                <td style="padding: 8px; border-bottom: none1px solid #e0e0e0;">${item.description || ''}</td>
<td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${item.synonym || ''}</td>
<td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><a href="https://www.omim.org/entry/${item.id}" target="_blank">${item.omim_id || ''}</a></td>
<td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${referenceLinks}</td>
<td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${item.localization || ''}</td>
                            </tr>
                        `;
                    }).join('')
                </tbody>
            </table>
        `;
        batchResultsContainer.style.display = 'block';
        table.style.display = 'none';
    });

    clearBatchResultsBtn.addEventListener('click', () => {
        batchResultsDiv.innerHTML = '';
        batchResultsContainer.style.display = 'none';
        batchGenesInput.value = '';
        table.style.display = 'none';
        hideError();
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
    showSection('home');
    if (document.getElementById('ciliahub')) {
        loadCiliaHubData();
    }
});
```
