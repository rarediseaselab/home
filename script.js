// Sample data for CiliaHub table (used as fallback)
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('script.js loaded at', new Date().toLocaleString());

    // Navigation handling
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.navbar a');

    function showSection(targetId) {
        console.log('Showing section:', targetId);
        sections.forEach(section => {
            section.style.display = section.id === targetId ? 'block' : 'none';
        });
        console.log(`${targetId} section displayed`);
        // Initialize CiliaHub if navigated to ciliahub
        if (targetId === 'ciliahub') {
            initializeCiliahub(0); // Start with retry count 0
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
            window.location.hash = targetId;
        });
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => {
        const targetId = window.location.hash.substring(1) || 'home';
        showSection(targetId);
    });

    // Show section based on initial hash
    const initialHash = window.location.hash.substring(1) || 'home';
    showSection(initialHash);

    // Night mode toggle
    const nightModeToggle = document.getElementById('night-mode-toggle');
    if (nightModeToggle) {
        nightModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('night-mode');
            console.log('Night mode toggled');
        });
    } else {
        console.warn('Night mode toggle button not found');
    }
});

// Initialize CiliaHub with retry mechanism
function initializeCiliahub(retryCount) {
    console.log('Initializing CiliaHub for hash:', window.location.hash, 'Retry:', retryCount);
    const ciliahubSection = document.getElementById('ciliahub');
    const maxRetries = 10;

    if (!ciliahubSection) {
        console.error('Error: #ciliahub section not found in DOM');
        if (retryCount < maxRetries) {
            setTimeout(() => initializeCiliahub(retryCount + 1), 100);
        } else {
            console.error('Max retries reached. CiliaHub initialization failed.');
            // Add error message to container
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: CiliaHub section not found. Please check HTML.</p>';
            }
        }
        return;
    }

    if (ciliahubSection.style.display === 'none') {
        console.warn('CiliaHub section not visible yet, retrying...');
        if (retryCount < maxRetries) {
            setTimeout(() => initializeCiliahub(retryCount + 1), 100);
        } else {
            console.error('Max retries reached. CiliaHub section remains hidden.');
            const container = ciliahubSection.querySelector('.container');
            if (container) {
                container.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: CiliaHub section not visible. Please check navigation.</p>';
            }
        }
        return;
    }

    loadDataAndPopulateTable();
    setupCiliahubEventListeners();
}

// Load data (try external JSON, fall back to sample)
async function loadDataAndPopulateTable() {
    let data = ciliahubData;
    console.log('Attempting to load CiliaHub data...');
    try {
        const response = await fetch('ciliahub_data.json');
        if (response.ok) {
            data = await response.json();
            console.log('Loaded external data:', data.length, 'rows');
        } else {
            console.warn('External data fetch failed (status:', response.status, '). Using sample data.');
        }
    } catch (error) {
        console.warn('Error fetching ciliahub_data.json:', error.message, '. Using sample data.');
    }
    populateCiliahubTable(data);
}

// Populate CiliaHub table
function populateCiliahubTable(data) {
    console.log('Populating CiliaHub table with', data.length, 'rows');
    const tbody = document.querySelector('.ciliahub-table tbody');
    if (!tbody) {
        console.error('Error: .ciliahub-table tbody not found in DOM');
        const tableContainer = document.querySelector('.ciliahub-table');
        if (tableContainer) {
            tableContainer.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: Table body not found. Please check HTML structure.</p>';
        }
        return;
    }
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No Data Available</td></tr>';
        console.warn('No data to display in CiliaHub table');
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const localizationClass = item.localization.toLowerCase().replace(/\s+/g, '-');
        row.classList.add(localizationClass);
        row.innerHTML = `
            <td>${item.gene || ''}</td>
            <td>${item.ensemblId || ''}</td>
            <td>${item.description || ''}</td>
            <td>${item.synonym || ''}</td>
            <td class="reference" data-tooltip="${item.reference || ''}">${item.reference || ''}</td>
            <td>${item.localization || ''}</td>
        `;
        tbody.appendChild(row);
    });
    console.log('CiliaHub table population complete');
}

// Set up event listeners for CiliaHub controls
function setupCiliahubEventListeners() {
    console.log('Setting up CiliaHub event listeners...');
    const searchInput = document.getElementById('ciliahub-search');
    const filterSelect = document.getElementById('ciliahub-filter');
    const resetButton = document.getElementById('ciliahub-reset');
    const downloadButton = document.getElementById('download-ciliahub');

    if (!searchInput || !filterSelect || !resetButton || !downloadButton) {
        console.error('Error: One or more CiliaHub control elements not found. Check IDs:', {
            searchInput: !!searchInput,
            filterSelect: !!filterSelect,
            resetButton: !!resetButton,
            downloadButton: !!downloadButton
        });
        const container = document.querySelector('#ciliahub .container');
        if (container) {
            container.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: CiliaHub controls not found. Please check HTML.</p>';
        }
        return;
    }

    searchInput.addEventListener('input', () => {
        console.log('CiliaHub search input changed to:', searchInput.value);
        filterCiliahubTable();
    });

    filterSelect.addEventListener('change', () => {
        console.log('CiliaHub filter changed to:', filterSelect.value);
        filterCiliahubTable();
    });

    resetButton.addEventListener('click', () => {
        console.log('CiliaHub reset button clicked');
        searchInput.value = '';
        filterSelect.value = '';
        populateCiliahubTable(ciliahubData); // Repopulate to show all rows
    });

    downloadButton.addEventListener('click', () => {
        console.log('CiliaHub download button clicked');
        downloadCiliahubCSV();
    });

    console.log('CiliaHub event listeners attached successfully');
}

// Filter CiliaHub table
function filterCiliahubTable() {
    console.log('Filtering CiliaHub table...');
    const searchInput = document.getElementById('ciliahub-search');
    const filterSelect = document.getElementById('ciliahub-filter');
    const tbody = document.querySelector('.ciliahub-table tbody');

    if (!tbody) {
        console.error('Error: CiliaHub table body not found during filtering');
        const tableContainer = document.querySelector('.ciliahub-table');
        if (tableContainer) {
            tableContainer.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: Table body not found during filtering.</p>';
        }
        return;
    }

    const searchTerm = searchInput?.value.toLowerCase() || '';
    const filterValue = filterSelect?.value || '';
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No Data Available</td></tr>';
        console.warn('No rows to filter in CiliaHub table');
        return;
    }

    let visibleRows = 0;
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        const matchesFilter = filterValue === '' || row.classList.contains(filterValue);
        row.style.display = matchesSearch && matchesFilter ? '' : 'none';
        if (matchesSearch && matchesFilter) visibleRows++;
    });

    if (visibleRows === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No Matching Data Found</td></tr>';
    }

    console.log('CiliaHub filtered to', visibleRows, 'visible rows');
}

// Download CiliaHub data as CSV
function downloadCiliahubCSV() {
    console.log('Generating CiliaHub CSV download...');
    const headers = ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'Reference', 'Ciliary Localization'];
    const rows = ciliahubData.map(item => [
        `"${item.gene || ''}"`,
        `"${item.ensemblId || ''}"`,
        `"${item.description || ''}"`,
        `"${item.synonym || ''}"`,
        `"${item.reference || ''}"`,
        `"${item.localization || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ciliahub_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('CiliaHub CSV download initiated');
}
