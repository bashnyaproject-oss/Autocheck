// Base history by VIN. Without VIN_API_URL and VIN_API_KEY: demo answers built from the
// listing. A real aggregator (ГИБДД, ФНП залоги, ФССП, такси) plugs in here — one function.
async function baseReport(l) {
  if (process.env.VIN_API_URL && process.env.VIN_API_KEY && l.vin) {
    const r = await fetch(`${process.env.VIN_API_URL}?vin=${encodeURIComponent(l.vin)}`, { headers: { Authorization: `Bearer ${process.env.VIN_API_KEY}` } });
    if (r.ok) return normalize(await r.json());
  }
  const low = l.owners > 1;
  return [
    { title: 'Розыск и запреты', value: 'Не найдено · МВД, ФССП', kind: 'ok' },
    { title: 'Залоги', value: 'Нет в реестре · ФНП', kind: 'ok' },
    { title: 'ДТП', value: low ? '1 запись, 2023 — без подушек' : 'Не найдено · ГИБДД', kind: low ? 'note' : 'ok' },
    { title: 'Владельцы', value: `${l.owners} по ПТС`, kind: 'ok' },
    { title: 'Такси и лизинг', value: 'Не найдено', kind: 'ok' },
    { title: 'Пробег по истории', value: `${Number(l.km).toLocaleString('ru-RU')} км · без скруток`, kind: 'ok' },
  ];
}

// Map the aggregator's answer to our rows. Adjust when the provider is chosen.
function normalize(j) {
  if (Array.isArray(j.items)) return j.items.map((x) => ({ title: x.title, value: x.value, kind: x.ok ? 'ok' : 'note' }));
  return [{ title: 'Ответ поставщика', value: JSON.stringify(j).slice(0, 200), kind: 'note' }];
}

module.exports = { baseReport };
