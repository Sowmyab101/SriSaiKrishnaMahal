/* Shared interactions for the site:
  - responsive nav toggle
  - year inject
  - booking form saves to localStorage
  - admin authentication (demo) using SHA-256 hash comparison
  - export CSV, clear bookings
*/

document.addEventListener('DOMContentLoaded', ()=> {
  // Nav toggle for mobile
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      navLinks.classList.toggle('show');
    });
  }

  // Years
  const years = ['year','year2','year3','year4','year5','year6'];
  const y = new Date().getFullYear();
  years.forEach(id => { const el = document.getElementById(id); if(el) el.textContent = y; });

  // Booking form
  const bookingForm = document.getElementById('bookingForm');
  if(bookingForm){
    bookingForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const email = document.getElementById('email').value.trim();
      const eventType = document.getElementById('eventType').value;
      const date = document.getElementById('date').value;
      const guests = document.getElementById('guests').value;
      const notes = document.getElementById('notes').value.trim();

      if(!name || !phone || !date || !guests){
        showBookingMsg('Please fill required fields (name, phone, date, guests).', true);
        return;
      }

      const booking = {
        id: 'bk_' + Date.now(),
        name, phone, email, eventType, date, guests, notes, createdAt: new Date().toISOString()
      };

      // Save in localStorage array "srisai_bookings"
      let arr = JSON.parse(localStorage.getItem('srisai_bookings') || '[]');
      arr.unshift(booking);
      localStorage.setItem('srisai_bookings', JSON.stringify(arr));

      showBookingMsg('Booking submitted! We will contact you soon.');
      bookingForm.reset();
    });
  }

  function showBookingMsg(msg, isError){
    const el = document.getElementById('bookingMsg');
    if(!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#ffb3b3' : '#ffd166';
    setTimeout(()=> el.textContent = '', 6000);
  }

  // Admin functions
  const adminLoginBtn = document.getElementById('adminLogin');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminPass = document.getElementById('adminPass');
  const adminMsg = document.getElementById('adminMsg');
  const bookingsArea = document.getElementById('bookingsArea');

  async function sha256Hex(str){
    const enc = new TextEncoder();
    const buf = enc.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
    return hex;
  }

  if(adminLoginBtn){
    adminLoginBtn.addEventListener('click', async ()=>{
      const pass = adminPass.value || '';
      if(!pass){ adminMsg.textContent = 'Enter password.'; adminMsg.style.color='#ffb3b3'; return; }

      // Compare hashed password to ADMIN_HASH (declared in admin.html)
      try{
        const inputHash = await sha256Hex(pass);
        if(typeof ADMIN_HASH === 'undefined'){
          adminMsg.textContent = 'Admin HASH missing (developer error).';
          return;
        }
        if(inputHash === ADMIN_HASH){
          // authenticated
          adminMsg.textContent = 'Welcome, admin.';
          adminMsg.style.color = '#b6ffb6';
          adminLoginBtn.style.display = 'none';
          logoutBtn.style.display = 'inline-block';
          adminPass.value = '';
          showBookings();
          bookingsArea.style.display = 'block';
        } else {
          adminMsg.textContent = 'Incorrect password.';
          adminMsg.style.color = '#ffb3b3';
        }
      }catch(err){
        adminMsg.textContent = 'Error verifying password.';
      }
    });
  }

  if(logoutBtn){
    logoutBtn.addEventListener('click', ()=>{
      adminLoginBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
      bookingsArea.style.display = 'none';
      adminMsg.textContent = 'Logged out.';
      adminMsg.style.color = '#ffd166';
    });
  }

  // show bookings table
  function showBookings(){
    const tbody = document.querySelector('#bookingsTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const arr = JSON.parse(localStorage.getItem('srisai_bookings') || '[]');
    if(arr.length === 0){
      tbody.innerHTML = '<tr><td colspan="9" style="color:var(--muted)">No bookings yet.</td></tr>';
      return;
    }
    arr.forEach(b=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.id}</td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.phone)}</td>
        <td>${escapeHtml(b.email||'')}</td>
        <td>${escapeHtml(b.eventType)}</td>
        <td>${escapeHtml(b.date)}</td>
        <td>${escapeHtml(b.guests)}</td>
        <td>${escapeHtml(b.notes||'')}</td>
        <td>${new Date(b.createdAt).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('exportCsv');
  if(exportBtn){
    exportBtn.addEventListener('click', ()=>{
      const arr = JSON.parse(localStorage.getItem('srisai_bookings') || '[]');
      if(arr.length===0){ alert('No bookings to export.'); return; }
      const csvRows = [];
      const headers = ['id','name','phone','email','eventType','date','guests','notes','createdAt'];
      csvRows.push(headers.join(','));
      arr.forEach(r=>{
        csvRows.push(headers.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','));
      });
      const blob = new Blob([csvRows.join('\n')], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `srisai_bookings_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Clear bookings
  const clearBtn = document.getElementById('clearBookings');
  if(clearBtn){
    clearBtn.addEventListener('click', ()=>{
      if(!confirm('Clear all bookings? This action cannot be undone.')) return;
      localStorage.removeItem('srisai_bookings');
      showBookings();
    });
  }

  // small util
  function escapeHtml(s){
    if(!s) return '';
    return s.replace(/[&<>"'`=\/]/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[ch];
    });
  }

}); // DOMContentLoaded
