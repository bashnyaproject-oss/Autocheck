import type { DeepReport, Listing } from './types';

const L = (l: Omit<Listing, 'sellerVerified' | 'inspectedBy'> & Partial<Listing>): Listing => ({
  sellerVerified: true,
  inspectedBy: 'Пункт «Осмотрено Савёловская»',
  ...l,
});

export const LISTINGS: Listing[] = [
  L({ id: 'l1', make: 'Toyota', model: 'RAV4', year: 2019, price: 2890000, marketPrice: 2990000, km: 68400, engine: '2.0 л, 149 л.с.', gearbox: 'Автомат', drive: 'Полный', body: 'suv', color: '#7C8A96', city: 'Москва', district: 'Отрадное', distanceKm: 7, owners: 1, inspectedAt: '14.10.2026', grade: 91, flags: [{ kind: 'ok', text: 'Пробег подтверждён' }, { kind: 'ok', text: 'Без окрасов' }, { kind: 'ok', text: 'Один владелец' }] }),
  L({ id: 'l2', make: 'Kia', model: 'Rio', year: 2020, price: 1290000, marketPrice: 1360000, km: 54200, engine: '1.6 л, 123 л.с.', gearbox: 'Автомат', drive: 'Передний', body: 'sedan', color: '#B8282E', city: 'Москва', district: 'Марьина Роща', distanceKm: 3, owners: 1, inspectedAt: '16.10.2026', grade: 88, flags: [{ kind: 'ok', text: 'Пробег подтверждён' }, { kind: 'note', text: 'Перекрашен задний бампер' }] }),
  L({ id: 'l3', make: 'Volkswagen', model: 'Polo', year: 2020, price: 1240000, marketPrice: 1300000, km: 61000, engine: '1.6 л, 110 л.с.', gearbox: 'Автомат', drive: 'Передний', body: 'sedan', color: '#4E6E93', city: 'Москва', district: 'Тимирязевская', distanceKm: 4, owners: 1, inspectedAt: '12.10.2026', grade: 90, flags: [{ kind: 'ok', text: 'Без окрасов' }, { kind: 'ok', text: 'Ошибок в блоках нет' }] }),
  L({ id: 'l4', make: 'Haval', model: 'Jolion', year: 2023, price: 2190000, marketPrice: 2240000, km: 21700, engine: '1.5 л турбо, 143 л.с.', gearbox: 'Робот', drive: 'Передний', body: 'suv', color: '#2F5D7C', city: 'Мытищи', district: 'Центр', distanceKm: 16, owners: 1, inspectedAt: '18.10.2026', grade: 94, flags: [{ kind: 'ok', text: 'На гарантии дилера' }, { kind: 'ok', text: 'Без окрасов' }] }),
  L({ id: 'l5', make: 'Skoda', model: 'Octavia', year: 2019, price: 1790000, marketPrice: 1820000, km: 96800, engine: '1.4 л турбо, 150 л.с.', gearbox: 'Робот', drive: 'Передний', body: 'hatch', color: '#2B3238', city: 'Москва', district: 'Сокол', distanceKm: 6, owners: 2, inspectedAt: '10.10.2026', grade: 69, flags: [{ kind: 'note', text: 'Окрашены 2 детали' }, { kind: 'note', text: 'Скоро замена сцепления DSG' }] }),
  L({ id: 'l6', make: 'Mazda', model: 'CX-5', year: 2018, price: 2350000, marketPrice: 2290000, km: 87500, engine: '2.0 л, 150 л.с.', gearbox: 'Автомат', drive: 'Полный', body: 'suv', color: '#8E1B26', city: 'Королёв', district: 'Центр', distanceKm: 27, owners: 2, inspectedAt: '09.10.2026', grade: 81, flags: [{ kind: 'ok', text: 'Пробег подтверждён' }, { kind: 'note', text: 'Сколы на капоте' }] }),
  L({ id: 'l7', make: 'Lada', model: 'Vesta SW Cross', year: 2021, price: 1340000, marketPrice: 1390000, km: 48900, engine: '1.6 л, 113 л.с.', gearbox: 'Механика', drive: 'Передний', body: 'hatch', color: '#D9772B', city: 'Долгопрудный', district: 'Центр', distanceKm: 21, owners: 1, inspectedAt: '11.10.2026', grade: 86, flags: [{ kind: 'ok', text: 'Один владелец' }, { kind: 'ok', text: 'Без ДТП' }] }),
  L({ id: 'l8', make: 'Hyundai', model: 'Creta', year: 2021, price: 1950000, marketPrice: 1990000, km: 33100, engine: '1.6 л, 123 л.с.', gearbox: 'Автомат', drive: 'Передний', body: 'suv', color: '#A9412C', city: 'Москва', district: 'Люблино', distanceKm: 12, owners: 1, inspectedAt: '15.10.2026', grade: 77, flags: [{ kind: 'ok', text: 'Пробег подтверждён' }, { kind: 'note', text: 'Перекрашено переднее крыло' }] }),
];

export function mockReport(l: Listing): DeepReport {
  const lowish = l.grade < 72;
  return {
    listingId: l.id,
    history: [
      { title: 'Розыск и запреты', value: 'Не найдено · МВД, ФССП', kind: 'ok' },
      { title: 'Залоги', value: 'Нет в реестре · ФНП', kind: 'ok' },
      { title: 'ДТП', value: lowish ? '1 запись, 2023 — без подушек' : 'Не найдено · ГИБДД', kind: lowish ? 'note' : 'ok' },
      { title: 'Владельцы', value: `${l.owners} по ПТС`, kind: 'ok' },
      { title: 'Такси и лизинг', value: 'Не найдено', kind: 'ok' },
      { title: 'Пробег по истории', value: `${l.km.toLocaleString('ru-RU')} км · без скруток`, kind: 'ok' },
    ],
    paint: [
      { part: 'Капот', microns: 112 },
      { part: 'Крыло ПЛ', microns: 104 },
      { part: 'Дверь ПЛ', microns: 118 },
      { part: 'Крыша', microns: 109 },
      { part: 'Бампер задний', microns: l.flags.some((f) => f.text.includes('бампер')) ? 240 : 120 },
    ],
    checklist: [
      { title: 'Двигатель: запуск, шумы, подтёки', ok: true },
      { title: 'Коробка: переключения, рывки', ok: !lowish, note: lowish ? 'Рывки 1–2, нужна адаптация или сцепление' : undefined },
      { title: 'Ходовая на подъёмнике', ok: true },
      { title: 'Ошибки в электронных блоках', ok: true },
      { title: 'Документы и VIN сверены', ok: true },
    ],
  };
}
