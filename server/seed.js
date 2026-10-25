// Demo listings, each already inspected (grade ≥ 60), around Moscow.
// Idempotent: runs on every start and upserts the demo cars (ids l1…l16) so an existing database
// picks up new fields and photos. Photos are generated studio shots (photos/, see photos.yml).
//  id, make, model, year, price, market, km, engine, power, fuel, l/100, gearbox, drive, body, color,
//  city, district, lat, lng, owners, grade, flags, interior
const CARS = [
  ['l1', 'Toyota', 'RAV4', 2019, 2890000, 2990000, 68400, '2.0 л', 149, 'Бензин', 7.6, 'Вариатор', 'Полный', 'suv', '#7C8A96', 'Москва', 'Отрадное', 55.8636, 37.605, 1, 91, [['ok', 'Пробег подтверждён'], ['ok', 'Без окрасов'], ['ok', 'Один владелец']], 'suv'],
  ['l2', 'Kia', 'Rio', 2020, 1290000, 1360000, 54200, '1.6 л', 123, 'Бензин', 6.6, 'Автомат', 'Передний', 'sedan', '#B8282E', 'Москва', 'Марьина Роща', 55.793, 37.611, 1, 88, [['ok', 'Пробег подтверждён'], ['note', 'Перекрашен задний бампер']], 'budget'],
  ['l3', 'Volkswagen', 'Polo', 2020, 1240000, 1300000, 61000, '1.6 л', 110, 'Бензин', 6.5, 'Автомат', 'Передний', 'sedan', '#2D4A78', 'Москва', 'Тимирязевская', 55.8186, 37.575, 1, 90, [['ok', 'Без окрасов'], ['ok', 'Ошибок в блоках нет']], 'budget'],
  ['l4', 'Haval', 'Jolion', 2023, 2190000, 2240000, 21700, '1.5 л турбо', 143, 'Бензин', 7.4, 'Робот', 'Передний', 'suv', '#2F6F86', 'Мытищи', 'Центр', 55.9116, 37.7308, 1, 94, [['ok', 'На гарантии дилера'], ['ok', 'Без окрасов']], 'suv'],
  ['l5', 'Skoda', 'Octavia', 2019, 1790000, 1820000, 96800, '1.4 л турбо', 150, 'Бензин', 6.2, 'Робот', 'Передний', 'hatch', '#2B3238', 'Москва', 'Сокол', 55.805, 37.515, 2, 69, [['note', 'Окрашены 2 детали'], ['note', 'Скоро замена сцепления DSG']], 'budget'],
  ['l6', 'Mazda', 'CX-5', 2018, 2350000, 2290000, 87500, '2.0 л', 150, 'Бензин', 7.9, 'Автомат', 'Полный', 'suv', '#8E1B26', 'Королёв', 'Центр', 55.9162, 37.8547, 2, 81, [['ok', 'Пробег подтверждён'], ['note', 'Сколы на капоте']], 'suv'],
  ['l7', 'Lada', 'Vesta SW Cross', 2021, 1340000, 1390000, 48900, '1.6 л', 113, 'Бензин', 7.5, 'Механика', 'Передний', 'hatch', '#D9772B', 'Долгопрудный', 'Центр', 55.9385, 37.5104, 1, 86, [['ok', 'Один владелец'], ['ok', 'Без ДТП']], 'budget'],
  ['l8', 'Hyundai', 'Creta', 2021, 1950000, 1990000, 33100, '1.6 л', 123, 'Бензин', 7.1, 'Автомат', 'Передний', 'suv', '#A9412C', 'Москва', 'Люблино', 55.676, 37.762, 1, 77, [['ok', 'Пробег подтверждён'], ['note', 'Перекрашено переднее крыло']], 'suv'],
  ['l9', 'Toyota', 'Camry', 2019, 2790000, 2850000, 74300, '2.5 л', 181, 'Бензин', 8.1, 'Автомат', 'Передний', 'sedan', '#111214', 'Москва', 'Хамовники', 55.729, 37.567, 1, 92, [['ok', 'Не такси — проверено по базам'], ['ok', 'Сервисная история']], 'premium'],
  ['l10', 'Kia', 'Sportage', 2020, 2290000, 2350000, 58800, '2.0 л', 150, 'Бензин', 8.2, 'Автомат', 'Полный', 'suv', '#2F3B33', 'Химки', 'Левобережный', 55.879, 37.468, 1, 87, [['ok', 'Пробег подтверждён'], ['ok', 'Без окрасов']], 'suv'],
  ['l11', 'Hyundai', 'Solaris', 2019, 1050000, 1120000, 82400, '1.6 л', 123, 'Бензин', 6.6, 'Автомат', 'Передний', 'sedan', '#ECECEC', 'Москва', 'Выхино', 55.715, 37.818, 2, 78, [['ok', 'Ошибок в блоках нет'], ['note', 'Мелкие сколы по кузову']], 'budget'],
  ['l12', 'Geely', 'Coolray', 2022, 1890000, 1960000, 29500, '1.5 л турбо', 150, 'Бензин', 7.2, 'Робот', 'Передний', 'suv', '#B9BDC2', 'Москва', 'Митино', 55.846, 37.361, 1, 89, [['ok', 'На гарантии'], ['ok', 'Без окрасов']], 'suv'],
  ['l13', 'Volkswagen', 'Tiguan', 2018, 2490000, 2560000, 91200, '2.0 л турбо', 180, 'Бензин', 8.6, 'Робот', 'Полный', 'suv', '#F2F2F0', 'Москва', 'Крылатское', 55.757, 37.408, 2, 80, [['ok', 'Пробег подтверждён'], ['note', 'Нужна замена передних колодок']], 'suv'],
  ['l14', 'Chery', 'Tiggo 8 Pro', 2022, 2390000, 2480000, 38700, '1.6 л турбо', 186, 'Бензин', 8.4, 'Робот', 'Передний', 'suv', '#A7ABB0', 'Москва', 'Бутово', 55.546, 37.535, 1, 85, [['ok', '7 мест'], ['ok', 'Без окрасов']], 'suv'],
  ['l15', 'Suzuki', 'Jimny', 2021, 2650000, 2700000, 24100, '1.5 л', 102, 'Бензин', 7.0, 'Механика', 'Полный', 'suv', '#D8CBA8', 'Москва', 'Сокольники', 55.792, 37.678, 1, 93, [['ok', 'Один владелец'], ['ok', 'Без бездорожья — днище чистое']], 'suv'],
  ['l16', 'BMW', '320i', 2018, 2690000, 2790000, 79900, '2.0 л турбо', 184, 'Бензин', 6.8, 'Автомат', 'Задний', 'sedan', '#F4F4F4', 'Москва', 'Пресненский', 55.761, 37.553, 2, 83, [['ok', 'Сервисная история у дилера'], ['note', 'Перекрашен капот']], 'premium'],
];

const CHECK = (low) => [
  { title: 'Двигатель: запуск, шумы, подтёки', ok: true },
  { title: 'Коробка: переключения, рывки', ok: !low, note: low ? 'Рывки 1–2, нужна адаптация или сцепление' : null },
  { title: 'Ходовая на подъёмнике', ok: true },
  { title: 'Ошибки в электронных блоках', ok: true },
  { title: 'Документы и VIN сверены', ok: true },
];

const SELLERS = [['s_demo1', 'Артём'], ['s_demo2', 'Ирина'], ['s_demo3', 'Михаил'], ['s_demo4', 'Ольга']];
const TEXT = [
  'Один владелец, обслуживание у дилера по регламенту. Вторая резина на дисках. Не такси, не битая.',
  'Покупал новой, езжу на работу и на дачу. Перекрашен задний бампер после парковки — видно в протоколе.',
  'Городская машина, гаражное хранение. Масло менял каждые 10 000 км, чеки есть.',
  'На гарантии дилера до 2028 года. Полный комплект ключей, коврики, сетка в багажник.',
  'Машина честная, но DSG скоро попросит сцепление — учёл в цене.',
  'Полный привод, зимой не подводила. Сколы на капоте — от трассы.',
  'Семейный универсал, детские кресла отдам в подарок.',
  'Свежая резина, недавно ТО. Перекрашено переднее крыло после мелкого касания.',
  'Комплектация «Престиж»: кожа, камера, подогрев всего. Обслуживание только у дилера.',
  'Полный привод, ездили на дачу и в Карелию. Новый аккумулятор, комплект зимней резины.',
  'Первая машина дочери, продаём — купили побольше. Ездила аккуратно, по городу.',
  'Брали новой в 2022, гарантия ещё действует. Вторая машина в семье, пробег маленький.',
  'Большой семейный кроссовер. DSG обслужена, масло менялось. Колодки нужно будет поменять.',
  'Семь мест, третий ряд почти не раскладывали. Панорамная крыша, камера 360.',
  'Настоящий внедорожник для города и выезда на природу. Хранился в паркинге.',
  'Драйверский седан, обслуживание по регламенту BMW. Капот перекрашен из-за сколов.',
];
const INTERIOR = { budget: 'int-budget', suv: 'int-suv', premium: 'int-premium' };
const photosOf = (id, interior) => [`/photos/${id}.jpg`, `/photos/${INTERIOR[interior]}.jpg`, '/photos/engine.jpg', '/photos/inspection.jpg'];

async function seed(db) {
  const days = (n) => new Date(Date.now() + n * 864e5).toISOString();
  for (const [id, name] of SELLERS) await db.query("insert into users (id,name,provider,subject) values ($1,$2,'demo',$1) on conflict do nothing", [id, name]);
  for (const [i, c] of CARS.entries()) {
    const [id, make, model, year, price, market, km, engine, power, fuel, cons, gearbox, drive, body, color, city, district, lat, lng, owners, grade, flags, interior] = c;
    await db.query(
      `insert into listings (id,status,make,model,year,price,market_price,km,engine,gearbox,drive,body,color,city,district,lat,lng,owners,vin,published_at,expires_at,seller_id,description,photos,power,fuel,consumption)
       values ($1,'published',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       on conflict (id) do update set make=excluded.make, model=excluded.model, year=excluded.year, engine=excluded.engine, color=excluded.color,
         photos=excluded.photos, power=excluded.power, fuel=excluded.fuel, consumption=excluded.consumption, gearbox=excluded.gearbox
       where listings.seller_id like 's_demo%'`,
      [id, make, model, year, price, market, km, `${engine}, ${power} л.с.`, gearbox, drive, body, color, city, district, lat, lng, owners, `XW8DEMO${String(1000000000 + i).slice(-10)}`,
        days(-14 + i * 0.8), days(50 + i), SELLERS[i % SELLERS.length][0], TEXT[i], JSON.stringify(photosOf(id, interior)), power, fuel, cons],
    );
    const paint = [['Капот', 112], ['Крыло ПЛ', 104], ['Дверь ПЛ', 118], ['Крыша', 109], ['Бампер задний', flags.some((f) => f[1].includes('бампер')) ? 240 : 120]].map(([part, microns]) => ({ part, microns }));
    await db.query(
      `insert into inspections (id,listing_id,point_id,status,grade,flags,checklist,paint,inspector,done_at) values ($1,$2,'o1','done',$3,$4,$5,$6,'Пункт «Осмотрено Савёловская»',$7) on conflict (id) do nothing`,
      ['i' + id, id, grade, JSON.stringify(flags.map(([kind, text]) => ({ kind, text }))), JSON.stringify(CHECK(grade < 72)), JSON.stringify(paint), days(-15 + i * 0.8)],
    );
  }
}

module.exports = { seed };
