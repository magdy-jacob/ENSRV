(function () {
  const yes = document.getElementById('has_residency_yes');
  const no = document.getElementById('has_residency_no');
  const details = document.getElementById('residencyDetails');
  const select = document.getElementById('residency_status');
  const other = document.getElementById('residency_status_other');

  function toggleDetails() {
    const show = yes.checked;
    details.classList.toggle('d-none', !show);

    // Only require dropdown when Yes
    if (select) select.required = show;

    if (!show) {
      // Clear when No
      if (select) {
        select.value = '';
        select.dispatchEvent(new Event('change'));
      }
    }
  }

  function toggleOther() {
    const showOther = (select && select.value === 'other');
    if (other) {
      other.classList.toggle('d-none', !showOther);
      other.required = !!showOther;
      if (!showOther) other.value = '';
    }
  }

  // Wire up
  if (yes) yes.addEventListener('change', toggleDetails);
  if (no) no.addEventListener('change', toggleDetails);
  if (select) select.addEventListener('change', toggleOther);

  // Initial state (supports server-side old() repopulation)
  document.addEventListener('DOMContentLoaded', () => {
    toggleDetails();
    toggleOther();
  });
})();

document.addEventListener('DOMContentLoaded', function () {
  const radios = document.querySelectorAll('input[name="has_relative_in_company"]');
  const wrap   = document.getElementById('relativeDetailsWrap');
  const input  = document.getElementById('relativeDetailsInput');

  function syncRelativeField() {
    const chosen = document.querySelector('input[name="has_relative_in_company"]:checked');
    const show   = chosen && chosen.value === 'yes';

    // show/hide
    wrap.classList.toggle('d-none', !show);

    // require only when shown
    input.required = show;

    // prevent accidental validation on hidden field
    input.disabled = !show;

    // clear value when hidden
    if (!show) {
      input.value = '';
      input.setCustomValidity('');
    }
  }

  radios.forEach(r => r.addEventListener('change', syncRelativeField));
  syncRelativeField(); // initialize on page load (handles edit forms too)
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form.confirm-submit');
  if (!form) return;

  // helper: pretty name fallback for inputs
  function prettyName(el) {
    if (!el) return 'Field';
    const raw = el.getAttribute('aria-label') || el.placeholder || el.name || el.id || el.type;
    if (!raw) return 'Field';
    // humanize e.g. driving_license -> Driving License
    return String(raw).replace(/[_\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Find wrapper used for radio group label/visuals
  function groupWrapper(el) {
    return el.closest('.comments-section') ||
           el.closest('.SelectionsDiv') ||
           el.closest('.form-group') ||
           el.closest('fieldset') ||
           el.parentElement;
  }

  // Smart function to get "question label" for a radio or input element
  function findLabelText(form, el) {
    if (!el) return null;

    // --- Prefer group heading for radios ---
    if (el.type === 'radio') {
      const wrap = groupWrapper(el);
      if (wrap) {
        // search for heading/label *not* .form-check-label (so we ignore 'Yes' labels)
        const selectors = [
          'label:not(.form-check-label)',
          '.form-label',
          'h2',
          'h3',
          'legend',
          'label.required',
          '.required.form-label',
          'p.lead',
          'span.label'
        ];
        for (const sel of selectors) {
          const node = wrap.querySelector(sel);
          if (node && node.innerText && node.innerText.trim()) {
            return node.innerText.trim();
          }
        }
        // check previous siblings if wrapper has no internal label
        let prev = wrap.previousElementSibling;
        while (prev) {
          if (/(LABEL|H2|H3|LEGEND|P|SPAN)/.test(prev.tagName)) {
            const t = prev.innerText.trim();
            if (t) return t;
          }
          prev = prev.previousElementSibling;
        }
      }
    }

    // --- regular inputs: look for explicit label[for=id] first ---
    if (el.id) {
      const lab = form.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab && lab.innerText && lab.innerText.trim()) return lab.innerText.trim();
    }
    // then try wrapping block
    const wrap2 = el.closest('.comments-section, .form-group, .mb-3, .field, .input-group, .form-floating, .SelectionsDiv');
    if (wrap2) {
      // prefer non-form-check label inside wrapper
      const lab = wrap2.querySelector('label:not(.form-check-label)');
      if (lab && lab.innerText && lab.innerText.trim()) return lab.innerText.trim();
      // fallback to any heading/label
      const other = wrap2.querySelector('h2,h3,legend,label,span');
      if (other && other.innerText && other.innerText.trim()) return other.innerText.trim();
    }

    // fallback to humanized name
    return prettyName(el);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function clearMarks(scope) {
    scope.querySelectorAll('.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
    });
    scope.querySelectorAll('.group-invalid').forEach(el => el.classList.remove('group-invalid'));
  }

  // if radio changed, clear group invalid marks
  function attachRadioClearHandlers() {
    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        const group = Array.from(form.querySelectorAll(`input[type="radio"][name="${CSS.escape(r.name)}"]`));
        group.forEach(rr => rr.classList.remove('is-invalid'));
        const wrap = groupWrapper(r);
        if (wrap) wrap.classList.remove('group-invalid');
      });
    });
  }
  attachRadioClearHandlers();

  function focusInvalid(item) {
    if (!item) return;
    if (item.type === 'radio') {
      const first = item.group && item.group[0];
      if (first) {
        const wrap = groupWrapper(first);
        if (wrap) wrap.scrollIntoView({behavior:'smooth', block:'center'});
        try { first.focus({preventScroll:true}); } catch(e){ first.focus(); }
      }
      return;
    }
    const el = item.el;
    if (!el) return;
    try {
      const wrap = el.closest('.comments-section') || el.closest('.SelectionsDiv');
      if (wrap) wrap.scrollIntoView({behavior:'smooth', block:'center'});
    } catch (e) {}
    try { el.focus({preventScroll:true}); } catch(e){ el.focus(); }
  }

  // Submit handler (main)
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearMarks(form);

    const invalid = [];
    const fields = Array.from(form.querySelectorAll('input, select, textarea')).filter(el => !el.disabled && el.willValidate !== false);

    // validate radio groups first (unique names)
    const radios = fields.filter(f => f.type === 'radio');
    const radioNames = Array.from(new Set(radios.map(r => r.name).filter(Boolean)));
    for (const name of radioNames) {
      const group = Array.from(form.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)).filter(r => !r.disabled);
      if (!group.length) continue;
      const need = group.some(r => r.required);
      const ok = group.some(r => r.checked);
      if (need && !ok) {
        invalid.push({ type: 'radio', group, el: group[0] });
      }
    }

    // validate other fields
    for (const el of fields) {
      if (el.type === 'radio') continue; // handled above

      // skip invisible non-select2 elements
      const isHidden = el.offsetParent === null;
      const isSelect2Hidden = el.classList.contains('select2-hidden-accessible');
      if (isHidden && !isSelect2Hidden) continue;

      // file input
      if (el.type === 'file' && el.required) {
        if (!el.files || el.files.length === 0) { invalid.push({type:'file', el}); continue; }
      }

      // checkbox
      if (el.type === 'checkbox' && el.required && !el.checked) {
        invalid.push({type:'checkbox', el}); continue;
      }

      // custom special-case (if you still need it)
      if (el.name === 'department' && (el.value === '' || el.value == null)) {
        invalid.push({type:'select', el}); continue;
      }

      if (!el.checkValidity()) {
        invalid.push({type:el.tagName.toLowerCase(), el});
      }
    }

    if (invalid.length) {
      // mark invalid UI
      invalid.forEach(item => {
        if (item.type === 'radio') {
          item.group.forEach(r => { r.classList.add('is-invalid'); r.setAttribute('aria-invalid','true'); });
          const wrap = groupWrapper(item.el.closest('.SelectionsDiv'));
          if (wrap) wrap.classList.add('group-invalid');
        } else if (item.el) {
          item.el.classList.add('is-invalid');
          item.el.setAttribute('aria-invalid','true');
          const wrap = item.el.closest('.comments-section');
          // if (wrap) wrap.classList.add('group-invalid');
        }
      });

      // build friendly list using group/question labels
      const items = invalid.map((item, i) => {
        const el = (item.type === 'radio' ? item.el : item.el);
        const anchor = `fld-${i}`;
        if (el) el.dataset.swalAnchor = anchor;
        // get group label (radio) or input label
        const labelText = (item.type === 'radio') ? (findLabelText(form, item.el) || prettyName(item.el)) : (findLabelText(form, item.el) || prettyName(item.el));
        return `<li><a href="#" style="text-align: left;" data-anchor="${anchor}">${escapeHtml(labelText)}</a></li>`;
      });

      // show Swal or fallback
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          title: 'Please complete the required fields',
          html: `<ul>${items.join('')}</ul>`,
          icon: 'question',
          confirmButtonText: 'Review'
        });
      } else {
        alert('Please complete the required fields:\n' + items.map(i => i.replace(/<[^>]+>/g, '')).join('\n'));
      }

      // focus first invalid
      focusInvalid(invalid[0]);
      return;
    }

    // confirm submit
    let confirmed = true;
    if (typeof Swal !== 'undefined') {
      const res = await Swal.fire({
        title: 'Confirm submission',
        text: form.getAttribute('data-confirm-message') || 'Submit this candidate?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit',
        cancelButtonText: 'Cancel'
      });
      confirmed = res.isConfirmed;
    } else {
      confirmed = confirm(form.getAttribute('data-confirm-message') || 'Submit this candidate?');
    }

    if (confirmed) {
      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = 'Submitting...'; }
      form.submit();
    }
  });

  // clicking a label inside the Swal list jumps to the field/group
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-anchor]');
    if (!a) return;
    ev.preventDefault();
    const target = document.querySelector(`[data-swal-anchor="${a.dataset.anchor}"]`);
    if (!target) return;
    if (target.type === 'radio') {
      const group = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(target.name)}"]`));
      if (group.length) {
        const first = group[0];
        const wrap = groupWrapper(first);
        if (wrap) wrap.scrollIntoView({behavior:'smooth', block:'center'});
        try { first.focus({preventScroll:true}); } catch(e){ first.focus(); }
      }
      return;
    }
    try { target.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){}
    try { target.focus({preventScroll:true}); } catch(e){ target.focus(); }
  });
});

(function () {
  // --- Config: lists of fields to sum for each group ---
  const GROUPS = {
    current: {
      fields: [
        'current_basic_salary',
        'current_accommodation',
        'current_transportation',
        'current_overtime',
        'current_other_allowance',
        'current_special_allowance',
        'current_allowance'
      ],
      displayId: 'current_total_salary_display',
      hiddenId:  'current_total_salary',    // hidden input id
      hiddenName:'current_total_salary'     // hidden/disabled input name (fallback)
    },
    expectations: {
      fields: [
        'expectations_basic_salary',
        'expectations_accommodation',
        'expectations_transportation',
        'expectations_overtime',
        'expectations_other_allowance',
        'expectations_special_allowance',
        'expectations_allowance'
      ],
      displayId: 'expectations_total_salary_display',
      hiddenId:  'expectations_total_salary',
      hiddenName:'expectations_total_salary'
    }
  };

  // --- Utils ---
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }
  function parseMoney(v) {
    if (v == null) return 0;
    const clean = String(v).replace(/[^\d.\-]/g, '');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

  function recompute(group) {
    let sum = 0;
    group.fields.forEach((name) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (!el) return; // silent if missing
      sum += parseMoney(el.value);
    });

    // Preferred targets (readonly + hidden)
    const displayEl = document.getElementById(group.displayId)
                      || document.querySelector(`[name="${group.hiddenName}"][disabled]`); // fallback to disabled visible input
    const hiddenEl  = document.getElementById(group.hiddenId)
                      || document.querySelector(`[name="${group.hiddenName}"]:not([disabled])`); // hidden/normal input

    if (displayEl) displayEl.value = fmt.format(sum);
    if (hiddenEl)  hiddenEl.value  = sum.toFixed(2);
  }

  function wire(group) {
    // Bind to each field
    group.fields.forEach((name) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (!el) return;
      el.setAttribute('inputmode', 'decimal');
      ['input','change','blur'].forEach(evt => {
        el.addEventListener(evt, () => recompute(group));
      });
    });
    // Initial compute
    recompute(group);
  }

  ready(function () {
    // Wire both groups
    wire(GROUPS.current);
    wire(GROUPS.expectations);

    // Extra safety: if the form changes dynamically, delegate recompute
    const form = document.getElementById('candidateForm');
    if (form) {
      form.addEventListener('input', (e) => {
        if (e.target && e.target.name) {
          if (e.target.name.startsWith('current_'))      recompute(GROUPS.current);
          if (e.target.name.startsWith('expectations_')) recompute(GROUPS.expectations);
        }
      });
    }
  });
})();

$('.confirm-submit').on('submit', function(e){
  e.preventDefault();
  const form = this;
  Swal.fire({title: "Are you sure , you want to submit this request ?",
      icon: "success",
      confirmButtonText: "YES",
       showCancelButton:true,
        width: '20%',
     })
    .then(r => { if (r.isConfirmed) form.submit(); });
});

