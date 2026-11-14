export function bindNavigation() {
  const links = document.querySelectorAll('.top-nav-link');

  links.forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('href');
      if (!target) return;

      links.forEach((item) => item.classList.remove('selected', 'active'));
      link.classList.add(link.classList.contains('top-nav-link') ? 'active' : 'selected');
    });
  });
}
