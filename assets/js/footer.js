fetch('components/footer.html')
  .then(response => response.ok ? response.text() : '')
  .then(html => {
    const mount = document.getElementById('footerMount');
    if (mount && html) mount.innerHTML = html;
  })
  .catch(() => {
    const mount = document.getElementById('footerMount');
    if (mount) mount.innerHTML = '<footer class="app-footer">سيستم مراجعة المخازن - إنشاء وتصميم أ/ أحمد علاء - جميع الحقوق محفوظه ( للتواصل 01094938005 )</footer>';
  });
