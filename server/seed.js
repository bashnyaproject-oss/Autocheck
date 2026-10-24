// Demo listings, each already inspected (grade ≥ 60), around Moscow.
const CARS = [
  ['l1', 'Toyota', 'RAV4', 2019, 2890000, 2990000, 68400, '2.0 л, 149 л.с.', 'Автомат', 'Полный', 'suv', '#7C8A96', 'Москва', 'Отрадное', 55.8636, 37.6050, 1, 91, [['ok', 'Пробег подтверждён'], ['ok', 'Без окрасов'], ['ok', 'Один владелец']]],
  ['l2', 'Kia', 'Rio', 2020, 1290000, 1360000, 54200, '1.6 л, 123 л.с.', 'Автомат', 'Передний', 'sedan', '#B8282E', 'Москва', 'Марьина Роща', 55.7930, 37.6110, 1, 88, [['ok', 'Пробег подтверждён'], ['note', 'Перекрашен задний бампер']]],
  ['l3', 'Volkswagen', 'Polo', 2020, 1240000, 1300000, 61000, '1.6 л, 110 л.с.', 'Автомат', 'Передний', 'sedan', '#4E6E93', 'Москва', 'Тимирязевская', 55.8186, 37.5750, 1, 90, [['ok', 'Без окрасов'], ['ok', 'Ошибок в блоках нет']]],
  ['l4', 'Haval', 'Jolion', 2023, 2190000, 2240000, 21700, '1.5 л турбо, 143 л.с.', 'Робот', 'Передний', 'suv', '#2F5D7C', 'Мытищи', 'Центр', 55.9116, 37.7308, 1, 94, [['ok', 'На гарантии дилера'], ['ok', 'Без окрасов']]],
  ['l5', 'Skoda', 'Octavia', 2019, 1790000, 1820000, 96800, '1.4 л турбо, 150 л.с.', 'Робот', 'Передний', 'hatch', '#2B3238', 'Москва', 'Сокол', 55.8050, 37.5150, 2, 69, [['note', 'Окрашены 2 детали'], ['note', 'Скоро замена сцепления DSG']]],
  ['l6', 'Mazda', 'CX-5', 2018, 2350000, 2290000, 87500, '2.0 л, 150 л.с.', 'Автомат', 'Полный', 'suv', '#8E1B26', 'Королёв', 'Центр', 55.9162, 37.8547, 2, 81, [['ok', 'Пробег подтверждён'], ['note', 'Сколы на капоте']]],
  ['l7', 'Lada', 'Vesta SW Cross', 2021, 1340000, 1390000, 48900, '1.6 л, 113 л.с.', 'Механика', 'Передний', 'hatch', '#D9772B', 'Долгопрудный', 'Центр', 55.9385, 37.5104, 1, 86, [['ok', 'Один владелец'], ['ok', 'Без ДТП']]],
  ['l8', 'Hyundai', 'Creta', 2021, 1950000, 1990000, 33100, '1.6 л, 123 л.с.', 'Автомат', 'Передний', 'suv', '#A9412C', 'Москва', 'Люблино', 55.6760, 37.7620, 1, 77, [['ok', 'Пробег подтверждён'], ['note', 'Перекрашено переднее крыло']]],
];

const CHECK = (low) => [
  { title: 'Двигатель: запуск, шумы, подтёки', ok: true },
  { title: 'Коробка: переключения, рывки', ok: !low, note: low ? 'Рывки 1–2, нужна адаптация или сцепление' : null },
  { title: 'Ходовая на подъёмнике', ok: true },
  { title: 'Ошибки в электронных блоках', ok: true },
  { title: 'Документы и VIN сверены', ok: true },
];

const SELLERS = [['s_demo1', 'Артём'], ['s_demo2', 'Ирина'], ['s_demo3', 'Михаил']];
const TEXT = [
  'Один владелец, обслуживание у дилера по регламенту. Вторая резина на дисках. Не такси, не битая.',
  'Покупал новой, езжу на работу и на дачу. Перекрашен задний бампер после парковки — видно в протоколе.',
  'Городская машина, гаражное хранение. Масло менял каждые 10 000 км, чеки есть.',
  'На гарантии дилера до 2028 года. Полный комплект ключей, коврики, сетка в багажник.',
  'Машина честная, но DSG скоро попросит сцепление — учёл в цене.',
  'Полный привод, зимой не подводила. Сколы на капоте — от трассы.',
  'Семейный универсал, детские кресла отдам в подарок.',
  'Свежая резина, недавно ТО. Перекрашено переднее крыло после мелкого касания.',
];

async function seed(db) {
  const days = (n) => new Date(Date.now() + n * 864e5).toISOString();
  for (const [id, name] of SELLERS) await db.query("insert into users (id,name,provider,subject) values ($1,$2,'demo',$1) on conflict do nothing", [id, name]);
  for (const [i, c] of CARS.entries()) {
    const [id, make, model, year, price, market, km, engine, gearbox, drive, body, color, city, district, lat, lng, owners, grade, flags] = c;
    await db.query(
      `insert into listings (id,status,make,model,year,price,market_price,km,engine,gearbox,drive,body,color,city,district,lat,lng,owners,vin,published_at,expires_at,seller_id,description)
       values ($1,'published',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [id, make, model, year, price, market, km, engine, gearbox, drive, body, color, city, district, lat, lng, owners, `XW8DEMO${String(1000000000 + i).slice(-10)}`, days(-10 + i), days(50 + i), SELLERS[i % 3][0], TEXT[i]],
    );
    const paint = [['Капот', 112], ['Крыло ПЛ', 104], ['Дверь ПЛ', 118], ['Крыша', 109], ['Бампер задний', flags.some((f) => f[1].includes('бампер')) ? 240 : 120]].map(([part, microns]) => ({ part, microns }));
    await db.query(
      `insert into inspections (id,listing_id,point_id,status,grade,flags,checklist,paint,inspector,done_at) values ($1,$2,'o1','done',$3,$4,$5,$6,'Пункт «Осмотрено Савёловская»',$7)`,
      ['i' + id, id, grade, JSON.stringify(flags.map(([kind, text]) => ({ kind, text }))), JSON.stringify(CHECK(grade < 72)), JSON.stringify(paint), days(-12 + i)],
    );
  }
}

module.exports = { seed };
