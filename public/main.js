// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('sidebar-mobile-hidden');
    overlay.classList.toggle('hidden');
}

// Close sidebar when clicking on a link (mobile)
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function() {
        if (window.innerWidth < 1024) {
            toggleSidebar();
        }
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update active state
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
        }
    });
});

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
