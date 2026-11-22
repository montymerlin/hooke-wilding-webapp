/* The same authored listening records used by the gift garden's example reports. */
(() => {
  const data = window.GiftExampleData;
  const report = data.state('month');
  const select = document.querySelector('#survey-species');
  const format = value => Number(value.toFixed(2)).toLocaleString('en-GB');
  const month = new Intl.DateTimeFormat('en-GB', {month:'short', timeZone:'UTC'});
  const timestamp = new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Europe/London'});
  const hour = value => String(value).padStart(2, '0') + ':00';
  for (const bird of report.birds) select.add(new Option(bird.name, bird.scientific_name));

  const ranked = [...report.birds].sort((a, b) => b.observations - a.observations);
  document.querySelector('#survey-totals').textContent = report.species + ' species across ' + report.observations + ' detections';
  document.querySelector('#survey-ranks').innerHTML = ranked.map(bird =>
    '<li data-species="' + bird.id + '"><span>' + bird.name + '</span><span class="rank-track"><i style="width:' +
    (100 * bird.observations / ranked[0].observations) + '%"></i></span><b>' + bird.observations + '</b></li>'
  ).join('');

  function plot(target, records, bars) {
    const width = 440, height = 150, left = 28, right = 12, top = 12, bottom = 26;
    const floor = height - bottom;
    const span = width - left - right;
    const peak = Math.max(...records.map(row => row.rate));
    const step = Math.max(0.05, Math.ceil(peak / 2 * 10) / 10);
    const max = step * 2;
    const y = rate => floor - rate / max * (floor - top);
    const x = i => left + (bars ? (i + 0.5) / records.length : i / (records.length - 1)) * span;
    const points = records.map((row,i) => x(i) + ',' + y(row.rate)).join(' ');
    const grid = [0, step, max].map(v => '<line class="plot-grid" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="'+(left-5)+'" y="'+(y(v)+4)+'" text-anchor="end">'+format(v)+'</text>').join('');
    const marks = bars ? records.map((row,i) => {
      const w = span / records.length * 0.74;
      return '<rect x="'+(x(i)-w/2)+'" y="'+y(row.rate)+'" width="'+w+'" height="'+(floor-y(row.rate))+'" rx="1.5"><title>'+row.label+' · '+format(row.rate)+'</title></rect>';
    }).join('') : '<polygon class="plot-wash" points="'+left+','+floor+' '+points+' '+(width-right)+','+floor+'"/><polyline class="plot-line" points="'+points+'"/>'+records.map((row,i) =>
      '<circle cx="'+x(i)+'" cy="'+y(row.rate)+'" r="3"><title>'+row.label+' · '+format(row.rate)+'</title></circle>').join('');
    const ticks = bars ? [0,6,12,18,23] : [0,2,4,6,8,11];
    const labels = ticks.map(i => '<text x="'+x(i)+'" y="'+(height-5)+'" text-anchor="'+(i === 0 ? 'start' : i === records.length-1 ? 'end' : 'middle')+'">'+records[i].label+'</text>').join('');
    target.innerHTML = '<svg aria-hidden="true" viewBox="0 0 '+width+' '+height+'">'+grid+marks+labels+'</svg>';
  }
  function table(title, firstColumn, records) {
    return '<table><caption>'+title+'</caption><thead><tr><th>'+firstColumn+'</th><th>Detections / listening hour</th></tr></thead><tbody>'+records.map(row =>
      '<tr><th scope="row">'+row.label+'</th><td>'+format(row.rate)+'</td></tr>').join('')+'</tbody></table>';
  }
  function render() {
    const subset = data.comparisons(select.value);
    const name = select.selectedOptions[0].text;
    const chosen = report.birds.find(bird => bird.scientific_name === select.value);
    const history = document.querySelector('#survey-history');
    history.hidden = !chosen;
    if (chosen) {
      history.textContent = chosen.name + ' in this diary: first heard ' + timestamp.format(new Date(chosen.first_heard)) +
        ', last heard ' + timestamp.format(new Date(chosen.last_heard)) + '.';
    }
    for (const row of document.querySelectorAll('#survey-ranks li')) {
      row.classList.toggle('chosen-species', row.dataset.species === chosen?.id);
    }
    const months = subset.months.map(row => ({label:month.format(new Date(row.start)),rate:row.rate}));
    const hours = subset.rhythm.map(row => ({label:hour(row.hour),rate:row.rate}));
    const peak = rows => rows.reduce((a,b) => a.rate >= b.rate ? a : b);
    const strongestMonth = peak(months), strongestHour = peak(hours);
    plot(document.querySelector('#survey-year'), months, false);
    plot(document.querySelector('#survey-clock'), hours, true);
    document.querySelector('#survey-year-note').textContent = name+' · The seasonal peak is '+strongestMonth.label+', at '+format(strongestMonth.rate)+' detections per listening hour.';
    document.querySelector('#survey-clock-note').textContent = name+' · The busiest hour starts at '+strongestHour.label+', averaging '+format(strongestHour.rate)+' detections.';
    const week = subset.comparisons[1];
    const comparisonRow = (label, period) => '<div class="week-row"><span>'+label+'</span><strong>'+format(period.rate)+'</strong><small>'+period.observations+' detections / '+period.listening_hours+' hours</small></div>';
    document.querySelector('#survey-week').innerHTML = '<p class="survey-period">'+name+' · Detections per listening hour</p><p class="week-change">'+(week.change_percent>0?'+':'')+Math.round(week.change_percent)+'%<small>in the example week</small></p>'+
      comparisonRow('4–10 Nov',week.previous)+comparisonRow('11–17 Nov',week.current)+'<p class="survey-reading">Each week has the same listening time. A higher rate means more calls were detected per hour.</p>';
    document.querySelector('#survey-tables').innerHTML = table(name+' · Seasonal activity','Month',months)+table(name+' · Daily rhythm','Hour',hours);
  }
  select.addEventListener('change',render);
  render();
})();
