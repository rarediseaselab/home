// Sample data for CiliaHub table (from index.html)
const ciliahubData = [
    {
        gene: "ABCC4",
        ensemblId: "ENSG00000125257",
        description: "ATP binding cassette subfamily C member 4 (PEL blood group)",
        synonym: "MRP4|EST170205|MOAT-B|MOATB",
        reference: "PMID: 25173977; 30685088; 32228435",
        localization: "Membrane"
    },
    {
        gene: "ABLIM1",
        ensemblId: "ENSG00000099204",
        description: "actin binding LIM protein 1",
        synonym: "abLIM|limatin",
        reference: "PMID: 22684256; 20487527",
        localization: "Actin Cytoskeleton"
    },
    {
        gene: "ABLIM3",
        ensemblId: "ENSG00000173210",
        description: "actin binding LIM protein family member 3",
        synonym: "KIAA0843",
        reference: "PMID: 22684256",
        localization: "Actin Cytoskeleton"
    },
    {
        gene: "ACE2",
        ensemblId: "ENSG00000130234",
        description: "angiotensin converting enzyme 2",
        synonym: "ACEH",
        reference: "PMID: 33116139",
        localization: "Motile Cilium Membrane"
    },
    {
        gene: "ACTR2",
        ensemblId: "ENSG00000138071",
        description: "actin related protein 2",
        synonym: "ARP2",
        reference: "PMID: 22684256",
        localization: "Actin Cytoskeleton"
    }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('script.js loaded at', new Date().toLocaleString());

    // Navigation handling (override inline if needed)
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
            initializeCiliahub(0);
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
        if (localStorage.getItem('nightMode') === 'enabled') {
            document.body.classList.add('night-mode');
        }
        nightModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('night-mode');
            localStorage.setItem('nightMode', document.body.classList.contains('night-mode') ? 'enabled' : 'disabled');
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
    const maxRetries = 20;

    if (!ciliahubSection) {
        console.error('Error: #ciliahub section not found in DOM');
        if (retryCount < maxRetries) {
            console.log('Retrying CiliaHub initialization...');
            setTimeout(() => initializeCiliahub(retryCount + 1), 50);
            return;
        }
        console.error('Max retries reached. CiliaHub section not found.');
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: CiliaHub section not found. Please check HTML.</p>';
        }
        return;
    }

    const table = ciliahubSection.querySelector('.ciliahub-table');
    let tbody = table ? document.getElementById('ciliahub-table-body') || table.querySelector('tbody') : null;

    if (!table || !tbody) {
        console.warn('CiliaHub table or tbody not found. Table:', !!table, 'TBody:', !!tbody);
        if (!table) {
            console.error('Error: .ciliahub-table not found in #ciliahub');
            ciliahubSection.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: CiliaHub table not found. Please check HTML.</p>';
        } else if (!tbody) {
            console.warn('TBody missing, creating one...');
            tbody = document.createElement('tbody');
            tbody.id = 'ciliahub-table-body';
            table.appendChild(tbody);
        }
        if (retryCount < maxRetries) {
            console.log('Retrying CiliaHub initialization...');
            setTimeout(() => initializeCiliahub(retryCount + 1), 50);
            return;
        }
        console.error('Max retries reached. CiliaHub table/tbody not available.');
        ciliahubSection.innerHTML += '<p style="text-align: center; padding: 20px; color: red;">Error: CiliaHub table setup failed. Please check HTML.</p>';
        return;
    }

    console.log('CiliaHub section and table found, proceeding with initialization');
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
    const tbody = document.getElementById('ciliahub-table-body') || document.querySelector('.ciliahub-table tbody');
    if (!tbody) {
        console.error('Error: .ciliahub-table tbody not found in DOM during population');
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
        populateCiliahubTable(ciliahubData);
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
    const tbody = document.getElementById('ciliahub-table-body') || document.querySelector('.ciliahub-table tbody');

    if (!tbody) {
        console.error('Error: CiliaHub table body not found during filtering');
        const tableContainer = document.querySelector('.ciliahub-table');
        if (tableContainer) {
            tableContainer.innerHTML += '<p style="text-align: center; padding: 20px; color
