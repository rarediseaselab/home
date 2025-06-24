// Sample data for CiliaHub table (used if external data fails)
const ciliahubData = [
    {
        gene: "BBS1",
        ensemblId: "ENSG00000166266",
        description: "Bardet-Biedl syndrome 1 protein",
        synonym: "BBS2L2",
        reference: "Pir et al., 2024 (DOI: 10.1093/nar/gkad1044)",
        localization: "Axoneme"
    },
    {
        gene: "IFT88",
        ensemblId: "ENSG00000032742",
        description: "Intraflagellar transport 88",
        synonym: "TTC10",
        reference: "CiliaMiner, 2023",
        localization: "Basal Body"
    },
    {
        gene: "CEP290",
        ensemblId: "ENSG00000198707",
        description: "Centrosomal protein 290",
        synonym: "NPHP6",
        reference: "CilioGenics, 2022",
        localization: "Transition Zone"
    },
    {
        gene: "DYNC2H1",
        ensemblId: "ENSG00000187231",
        description: "Dynein cytoplasmic 2 heavy chain 1",
        synonym: "DHC2",
        reference: "Pir et al., 2024 (DOI: 10.1093/nar/gkad1044)",
        localization: "Axoneme"
    }
];

// Initialize CiliaHub table on page load or hash change
document.addEventListener('DOMContentLoaded', initializeCiliahub);
window.addEventListener('hashchange', initializeCiliahub);

function initializeCiliahub() {
    console.log('Initializing CiliaHub...');
    if (window.location.hash === '#ciliahub') {
        loadDataAndPopulateTable();
        setupEventListeners();
    }
}

// Load data (try external JSON, fall back to sample)
async function loadDataAndPopulateTable() {
    let data = ciliahubData; // Default to sample data
    try {
        const response = await fetch('ciliahub_data.json');
        if (response.ok) {
            data = await response.json();
            console.log('Loaded external data:', data);
        } else {
            console.warn('External data fetch failed, using sample data.');
        }
    } catch (error) {
        console.error('Error fetching ciliahub_data.json:', error);
        console.warn('Using sample data.');
    }
    populateCiliahubTable(data);
}

// Populate table with data
function populateCiliahubTable(data) {
    try {
        const tbody = document.querySelector('.ciliahub-table tbody');
        if (!tbody) throw new Error('Table body not found.');
        tbody.innerHTML = ''; // Clear existing rows

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center;">No Data Available</td>';
            tbody.appendChild(row);
            console.warn('No data to display.');
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            const localizationClass = item.localization.toLowerCase().replace(/\s+/g, '-');
            row.classList.add(localizationClass);
            row.innerHTML = `
                <td>${item.gene}</td>
                <td>${item.ensemblId}</td>
                <td>${item.description}</td>
                <td>${item.synonym}</td>
                <td class="reference" data-tooltip="${item.reference}">${item.reference}</td>
                <td>${item.localization}</td>
            `;
            tbody.appendChild(row);
        });
        console.log('Table populated with', data.length, 'rows.');
    } catch (error) {
        console.error('Error populating table:', error);
        const tbody = document.querySelector('.ciliahub-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading data. Please check console.</td></tr>';
        }
    }
}

// Set up event listeners for search, filter, reset, and download
function setupEventListeners() {
    try {
        const searchInput = document.getElementById('ciliahub-search');
        const filterSelect = document.getElementById('ciliahub-filter');
        const resetButton = document.getElementById('ciliahub-reset');
        const downloadButton = document.getElementById('download-ciliahub');

        if (!searchInput || !filterSelect || !resetButton || !downloadButton) {
            throw new Error('One or more control elements not found.');
        }

        searchInput.addEventListener('input', filterTable);
        filterSelect.addEventListener('change', filterTable);
        resetButton.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = '';
            filterTable();
            console.log('Search and filter reset.');
        });
        downloadButton.addEventListener('click', downloadCSV);

        console.log('Event listeners set up successfully.');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Filter table based on search and localization
function filterTable() {
    try {
        const searchTerm = document.getElementById('ciliahub-search').value.toLowerCase();
        const filterValue = document.getElementById('ciliahub-filter').value;
        const rows = document.querySelectorAll('.ciliahub-table tbody tr');

        let visibleRows = 0;
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matchesSearch = text.includes(searchTerm);
            const matchesFilter = filterValue === '' || row.classList.contains(filterValue);
            row.style.display = matchesSearch && matchesFilter ? '' : 'none';
            if (matchesSearch && matchesFilter) visibleRows++;
        });

        console.log('Filtered to', visibleRows, 'visible rows.');
        if (visibleRows === 0 && rows.length > 0) {
            const tbody = document.querySelector('.ciliahub-table tbody');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No matching data found.</td></tr>';
        }
    } catch (error) {
        console.error('Error filtering table:', error);
    }
}

// Download table data as CSV
function downloadCSV() {
    try {
        const headers = ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'Reference', 'Ciliary Localization'];
        const rows = ciliahubData.map(item => [
            `"${item.gene}"`,
            `"${item.ensemblId}"`,
            `"${item.description}"`,
            `"${item.synonym}"`,
            `"${item.reference}"`,
            `"${item.localization}"`
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'ciliahub_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('CSV downloaded successfully.');
    } catch (error) {
        console.error('Error downloading CSV:', error);
    }
}
