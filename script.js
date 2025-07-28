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
function loadCiliaHubData() {
    const tableBody = document.getElementById('ciliahub-table-body');
    const table = document.getElementById('ciliahub-table');
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
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                    <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                    <td>${item.description || ''}</td>
                    <td>${item.synonym || ''}</td>
                    <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id || ''}</a></td>
                    <td>${formatReference(item.reference)}</td>
                    <td>${item.localization || ''}</td>
                `;
                tableBody.appendChild(row);
            });
            table.style.display = 'table';
        } else {
            table.style.display = 'none';
            showError('No results found for the search query.');
        }
        loadingDiv.style.display = 'none';
    }

    function updatePopularGenes() {
        const sortedGenes = Object.entries(searchCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        popularGenesList.innerHTML = sortedGenes.length
            ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
            : '<li>No searches yet.</li>';
    }

    // Fetch with timeout
    const fetchWithTimeout = async (url, timeout = 10000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };

    // Load data
    fetchWithTimeout('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(jsonData => {
            data = jsonData;
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data is empty or not in the expected format.');
            }
            loadingDiv.style.display = 'none';
            updatePopularGenes();
        })
        .catch(error => {
            console.error('Error loading CiliaHub data:', error);
            let errorMessage = 'Failed to load CiliaHub data. Please try again later or contact support.';
            if (error.name === 'AbortError') {
                errorMessage = 'Data loading timed out. Please try again.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Data file not found. Please contact support.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Access to data file is restricted. Please contact support.';
            }
            showError(errorMessage);
        });

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
        let filteredData = data.filter(item => {
            return (
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query))
            );
        });
        if (filterValue) {
            filteredData = filteredData.filter(item => (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue);
        }
        populateTable(filteredData);
    });

    filterSelect.addEventListener('change', () => {
        hideError();
        const query = searchInput.value.trim().toLowerCase();
        const filterValue = filterSelect.value.toLowerCase();
        let filteredData = query
            ? data.filter(item => {
                return (
                    (item.gene && item.gene.toLowerCase().includes(query)) ||
                    (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                    (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                    (item.omim_id && item.omim_id.toLowerCase().includes(query))
                );
            })
            : data;
        if (filterValue) {
            filteredData = filteredData.filter(item => (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue);
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
            showError('Please enter at least one gene name or ID.');
            return;
        }
        const queries = input.split(/[,;\s]+/).filter(q => q.trim()).map(q => q.toLowerCase());
        queries.forEach(query => {
            searchCounts[query] = (searchCounts[query] || 0) + 1;
        });
        sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts));
        updatePopularGenes();
        const filteredData = data.filter(item => {
            return queries.some(query => (
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query))
            ));
        });
        batchResultsDiv.innerHTML = filteredData.length
            ? filteredData.map(item => {
                return `
                    <div style="margin-bottom: 10px;">
                        <strong>Gene:</strong> <a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a><br>
                        <strong>Ensembl ID:</strong> <a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a><br>
                        <strong>Description:</strong> ${item.description || ''}<br>
                        <strong>Synonym:</strong> ${item.synonym || ''}<br>
                        <strong>OMIM ID:</strong> <a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id || ''}</a><br>
                        <strong>Reference:</strong> ${formatReference(item.reference)}<br>
                        <strong>Localization:</strong> ${item.localization || ''}<br>
                    </div>
                `;
            }).join('')
            : '<p style="color: red;">No matching data found.</p>';
        batchResultsContainer.style.display = 'block';
    });

    clearBatchResultsBtn.addEventListener('click', () => {
        batchResultsDiv.innerHTML = '';
        batchResultsContainer.style.display = 'none';
        batchGenesInput.value = '';
        hideError();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('home');
    if (document.getElementById('ciliahub')) {
        loadCiliaHubData();
    }
});
```
