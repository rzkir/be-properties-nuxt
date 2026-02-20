// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('sidebar-mobile-hidden');
    overlay.classList.toggle('hidden');
}

// Function to update active link based on current scroll position
function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    if (sidebarLinks.length === 0) return; // Sidebar not loaded yet
    
    let currentSection = '';
    const scrollPosition = window.scrollY + 200; // Offset for better detection
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    // If no section found, check hash in URL
    if (!currentSection && window.location.hash) {
        currentSection = window.location.hash.substring(1);
    }
    
    // If still no section and at top of page, default to welcome
    if (!currentSection && window.scrollY < 100) {
        currentSection = 'welcome';
    }
    
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// Update active link on scroll
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        updateActiveLink();
    }, 100);
});

// Update active link on page load
function initActiveLink() {
    updateActiveLink();
}

// Initialize active link when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActiveLink);
} else {
    initActiveLink();
}

// Copy code function
function copyCode(button) {
    const codeBlock = button.closest('.code-block').querySelector('pre');
    const text = codeBlock.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('iconify-icon');
        icon.setAttribute('icon', 'lucide:check');
        setTimeout(() => {
            icon.setAttribute('icon', 'lucide:copy');
        }, 2000);
    });
}

// Search functionality
document.getElementById('search-input').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();

    document.querySelectorAll('section').forEach(section => {
        if (searchTerm.length < 2) {
            section.style.opacity = '1';
        } else {
            const text = section.textContent.toLowerCase();
            section.style.opacity = text.includes(searchTerm) ? '1' : '0.3';
        }
    });
});

// Load sidebar from sidebar.html
fetch('/sidebar.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('sidebar-container').innerHTML = html;
        // Re-attach event listeners after sidebar loads
        attachSidebarListeners();
        // Update active link after sidebar loads
        setTimeout(() => {
            updateActiveLink();
        }, 100);
    })
    .catch(error => console.error('Error loading sidebar:', error));

// Function to attach sidebar event listeners (using event delegation)
let sidebarListenersAttached = false;
function attachSidebarListeners() {
    // Use event delegation on sidebar container to handle clicks
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer || sidebarListenersAttached) return;
    
    sidebarListenersAttached = true;
    sidebarContainer.addEventListener('click', function(e) {
        const link = e.target.closest('a[href^="#"]');
        if (link && link.classList.contains('sidebar-link')) {
            e.preventDefault();
            
            // Close sidebar on mobile
            if (window.innerWidth < 1024) {
                toggleSidebar();
            }
            
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Update URL hash
                window.history.pushState(null, null, link.getAttribute('href'));
                // Update active state after scroll
                setTimeout(() => {
                    updateActiveLink();
                }, 100);
            }
        }
    });
}

// Function to copy curl code
function copyCurlCode(button) {
    const codeBlock = button.closest('.code-block');
    const preElement = codeBlock.querySelector('pre');
    const text = preElement.textContent || preElement.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('iconify-icon');
        const originalIcon = icon.getAttribute('icon');
        icon.setAttribute('icon', 'lucide:check');
        button.classList.add('text-green-400');
        
        setTimeout(() => {
            icon.setAttribute('icon', originalIcon);
            button.classList.remove('text-green-400');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Function to copy response code
function copyResponseCode(button) {
    const responseBlock = button.closest('.bg-slate-950');
    const preElement = responseBlock.querySelector('pre');
    const text = preElement.textContent || preElement.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('iconify-icon');
        const originalIcon = icon.getAttribute('icon');
        icon.setAttribute('icon', 'lucide:check');
        button.classList.add('text-green-400');
        
        setTimeout(() => {
            icon.setAttribute('icon', originalIcon);
            button.classList.remove('text-green-400');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}