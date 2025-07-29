// Updated loadCiliaHubData function with search-only display and statistical analysis
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
    // New elements for statistics
    const totalGenesSpan = document.getElementById('total-genes');
    const newGenesSpan = document.getElementById('new-genes');
    const newGenesPercentageSpan = document.getElementById('new-genes-percentage');
    const localizationStatsList = document.getElementById('localization-stats');
    const localizationChartCanvas = document.getElementById('localization-chart');

    let data = [];
    let searchCounts = JSON.parse(sessionStorage.getItem('popularGenes')) || {};
    let debounceTimeout;

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
        const formattedRefs = refs.map(ref => {
            // Check if the reference is a PMID (numeric)
            if (/^\d+$/.test(ref)) {
                return `<a href="https://pubmed.ncbi.nlm.nih.gov/${ref}/" target="_blank">${ref}</a>`;
            }
            // Check if the reference is a DOI (starts with https://doi.org/ or a raw DOI like 10.xxxx)
            else if (ref.startsWith('https://doi.org/') || /^10\.\d{4,}/.test(ref)) {
                const doi = ref.startsWith('https://doi.org/') ? ref.replace('https://doi.org/', '') : ref;
                const doiUrl = `https://doi.org/${doi}`;
                return `<a href="${doiUrl}" target="_blank">${doi}</a>`;
            }
            // Treat as a general URL
            else if (ref.startsWith('http://') || ref.startsWith('https://')) {
                return `<a href="${ref}" target="_blank">${ref}</a>`;
            }
            // Fallback for invalid references
            else {
                return ref;
            }
        });
        return formattedRefs.join(', ');
    }

    function populateTable(filteredData = []) {
        tableBody.innerHTML = '';
        
        // If no filtered data provided, hide table and show message
        if (filteredData.length === 0) {
            loadingDiv.style.display = 'none';
            table.style.display = 'none';
            return;
        }

        filteredData.forEach(item => {
            const sanitizedLocalization = (item.localization || '')
                .toLowerCase()
                .replace(/[\s,]+/g, '-');

            const referenceLinks = formatReference(item.reference);
            // Format synonyms as a list with line breaks
            const synonyms = item.synonym ? item.synonym.split(',').map(s => s.trim()).join('<br>') : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene}" target="_blank">${item.gene}</a></td>
                <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id}" target="_blank">${item.ensembl_id}</a></td>
                <td class="description" data-full-text="${item.description || ''}">${item.description || ''}</td>
                <td>${synonyms}</td>
                <td><a href="https://www.omim.org/entry/${item.omim_id}" target="_blank">${item.omim_id}</a></td>
                <td class="reference" data-tooltip="${item.reference || ''}">${referenceLinks}</td>
                <td>${item.localization || ''}</td>
            `;
            if (sanitizedLocalization) row.classList.add(sanitizedLocalization);
            tableBody.appendChild(row);
        });
        
        loadingDiv.style.display = 'none';
        table.style.display = 'table';
    }

    function updatePopularGenes() {
        const sortedGenes = Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        popularGenesList.innerHTML = sortedGenes.length
            ? sortedGenes.map(([gene, count]) => `<li>${gene} (${count} searches)</li>`).join('')
            : '<li>No searches yet.</li>';
    }

    function showSearchPrompt() {
        loadingDiv.innerHTML = 'Enter a search term to explore the CiliaHub database...';
        loadingDiv.style.display = 'block';
        table.style.display = 'none';
    }

    // New function to compute and display statistics
    function displayStatistics(data) {
        const totalGenes = data.length;
        const newGenes = 1300; // As per document
        const newGenesPercentage = ((newGenes / totalGenes) * 100).toFixed(1);

        // Compute distribution by localization
        const localizationCounts = {};
        data.forEach(item => {
            const localization = item.localization || 'Unknown';
            localizationCounts[localization] = (localizationCounts[localization] || 0) + 1;
        });

        // Update DOM with stats
        totalGenesSpan.textContent = totalGenes;
        newGenesSpan.textContent = newGenes;
        newGenesPercentageSpan.textContent = newGenesPercentage;

        // Populate localization stats
        localizationStatsList.innerHTML = Object.entries(localizationCounts)
            .map(([loc, count]) => `<li>${loc}: ${count} genes (${((count / totalGenes) * 100).toFixed(1)}%)</li>`)
            .join('');

        // Create Chart.js bar chart
        ```chartjs
        {
            "type": "bar",
            "data": {
                "labels": Object.keys(localizationCounts),
                "datasets": [{
                    "label": "Genes by Ciliary Localization",
                    "data": Object.values(localizationCounts),
                    "backgroundColor": [
                        "#004080", "#0066cc", "#3399ff", "#66b3ff", "#99ccff",
                        "#003366", "#004d99", "#0077b3", "#00a3cc", "#b3d9ff"
                    ],
                    "borderColor": "#002b5e",
                    "borderWidth": 1
                }]
            },
            "options": {
                "responsive": true,
                "maintainAspectRatio": false,
                "scales": {
                    "y": {
                        "beginAtZero": true,
                        "title": {
                            "display": true,
                            "text": "Number of Genes",
                            "color": "#203c78"
                        },
                        "ticks": {
                            "color": "#203c78"
                        }
                    },
                    "x": {
                        "title": {
                            "display": true,
                            "text": "Ciliary Localization",
                            "color": "#203c78"
                        },
                        "ticks": {
                            "color": "#203c78",
                            "maxRotation": 45,
                            "minRotation": 45
                        }
                    }
                },
                "plugins": {
                    "legend": {
                        "display": false
                    },
                    "title": {
                        "display": true,
                        "text": "Distribution of Genes by Ciliary Localization",
                        "color": "#203c78",
                        "font": {
                            "size": 16
                        }
                    }
                }
            }
        }
}

try {
const response = await fetch('https://raw.githubusercontent.com/rarediseaselab/home/main/ciliahub_data.json');
data = await response.json();
console.log('Loaded entries:', data.length);

// Display statistics
displayStatistics(data);

// Show search prompt instead of populating table
showSearchPrompt();
updatePopularGenes();
} catch (error) {
console.error('Error loading CiliaHub data:', error);
showError('Failed to load CiliaHub data. Please check your network or contact support.');
return;
}

function debounce(func, wait) {
return function (...args) {
clearTimeout(debounceTimeout);
debounceTimeout = setTimeout(() => func.apply(this, args), wait);
};
}

searchInput.addEventListener('input', debounce(() => {
hideError();
const query = searchInput.value.toLowerCase().trim();

if (!query) {
// If search is empty, hide table and show search prompt
showSearchPrompt();
return;
}

// Track search for popular genes
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

filterSelect.addEventListener('change', () => {
hideError();
const filterValue = filterSelect.value.toLowerCase();
const query = searchInput.value.toLowerCase().trim();

// Only show results if there's a search query or filter is applied
if (!query && !filterValue) {
showSearchPrompt();
return;
}

let filteredData = data;

// Apply search filter if query exists
if (query) {
filteredData = filteredData.filter(item =>
(item.gene && item.gene.toLowerCase().includes(query)) ||
(item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
(item.synonym && item.synonym.toLowerCase().includes(query)) ||
(item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
(item.reference && item.reference.toLowerCase().includes(query))
);
}

// Apply localization filter if selected
if (filterValue) {
filteredData = filteredData.filter(item =>
(item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
);
}

populateTable(filteredData);
});

resetBtn.addEventListener('click', () => {
hideError();
searchInput.value = '';
filterSelect.value = '';
searchCounts = {};
sessionStorage.removeItem('popularGenes');
updatePopularGenes();

// Show search prompt instead of all data
showSearchPrompt();
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
].map(row => row.map(cell => "${cell.replace(/"/g, '""')}").join(',')).join('\n');

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
batchResultsDiv.innerHTML = '

Please enter at least one gene name or ID.

'; batchResultsContainer.style.display = 'block'; return; } const queries = input.split(/[\s,\n]+/).filter(q => q.trim()).map(q => q.toLowerCase()); queries.forEach(query => { searchCounts[query] = (searchCounts[query] || 0) + 1; sessionStorage.setItem('popularGenes', JSON.stringify(searchCounts)); }); updatePopularGenes(); const filteredData = data.filter(item => queries.some(query => (item.gene && item.gene.toLowerCase() === query) || (item.ensembl_id && item.ensembl_id.toLowerCase() === query) || (item.synonym && item.synonym.toLowerCase().includes(query)) || (item.omim_id && item.omim_id.toLowerCase() === query) ) ); if (filteredData.length === 0) { batchResultsDiv.innerHTML = '
No matching genes found.

'; batchResultsContainer.style.display = 'block'; return; } batchResultsDiv.innerHTML = `
${filteredData.map(item => { const referenceLinks = formatReference(item.reference); return ` `; }).join('')}

Gene	Ensembl ID	Description	Synonym	OMIM ID	Reference	Localization
${item.gene}	${item.ensembl_id}	${item.description || ''}	${item.synonym || ''}	${item.omim_id}	${referenceLinks}	${item.localization || ''}
`; batchResultsContainer.style.display = 'block'; });
clearBatchResultsBtn.addEventListener('click', () => {
batchResultsDiv.innerHTML = '';
batchResultsContainer.style.display = 'none';
batchGenesInput.value = '';
});
}

// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
if (document.getElementById('ciliahub')) {
loadCiliaHubData();
}
});
