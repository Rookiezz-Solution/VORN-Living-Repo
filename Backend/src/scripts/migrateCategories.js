const { sql, connectDB, getPool } = require('../config/db');

const TARGET_CATEGORIES = [
  'Hook',
  'Common Shelf Small',
  'Bathroom Shelf',
  'Bathroom Tissue Roll Holder',
  'Bathroom Corner Soap Holder',
  'Toothbrush Holder',
  'Tray',
  'Kitchen Tissue Roll Holder',
  'Bottle Organizer',
  'Kitchen Spice Rack',
  'Coaster',
  'Book Shelf',
  'Key Stand',
  'Laptop Stand'
];

const slugify = (name) => {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
  return base;
};

const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const pickCategory = ({ productName, shortDescription, fullDescription, sku, oldCategoryName }) => {
  const text = norm([productName, shortDescription, fullDescription, sku, oldCategoryName].filter(Boolean).join(' '));

  const has = (...words) => words.every(w => text.includes(w));
  const any = (...words) => words.some(w => text.includes(w));

  if (any('laptop') && any('stand')) return 'Laptop Stand';
  if (any('key') && any('stand', 'holder')) return 'Key Stand';
  if (any('book') && any('shelf', 'rack')) return 'Book Shelf';
  if (any('coaster')) return 'Coaster';
  if (any('spice') && any('rack', 'organizer', 'holder')) return 'Kitchen Spice Rack';
  if (any('bottle') && any('organizer', 'holder', 'rack')) return 'Bottle Organizer';
  if (any('tray')) return 'Tray';
  if (any('hook')) return 'Hook';

  if (any('toothbrush')) return 'Toothbrush Holder';
  if (has('corner', 'soap')) return 'Bathroom Corner Soap Holder';
  if (any('soap') && any('corner')) return 'Bathroom Corner Soap Holder';

  if (any('tissue', 'roll')) {
    if (any('bath', 'bathroom', 'toilet', 'washroom')) return 'Bathroom Tissue Roll Holder';
    if (any('kitchen')) return 'Kitchen Tissue Roll Holder';
    if (any('paper')) return 'Kitchen Tissue Roll Holder';
    return 'Bathroom Tissue Roll Holder';
  }

  if (any('bath', 'bathroom') && any('shelf')) return 'Bathroom Shelf';
  if (any('shelf', 'rack')) return 'Common Shelf Small';

  if (any('bath', 'bathroom')) return 'Bathroom Shelf';
  if (any('kitchen')) return 'Kitchen Spice Rack';

  return 'Common Shelf Small';
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const set = new Set(args);
  return {
    dryRun: set.has('--dry-run') || set.has('-n') || !set.has('--apply'),
    apply: set.has('--apply')
  };
};

const main = async () => {
  const { dryRun, apply } = parseArgs();
  if (!apply) {
    console.log('Running in DRY-RUN mode. Use --apply to commit changes.');
  }

  await connectDB();
  const pool = getPool();
  if (!pool || !pool.connected) throw new Error('DB pool is not connected');

  const tx = new sql.Transaction(pool);
  await tx.begin();
  const req = new sql.Request(tx);

  try {
    const catRes = await req.query(`
      SELECT CategoryID, CategoryName, CategorySlug, ISNULL(DisplayOrder, 0) AS DisplayOrder, ISNULL(IsActive, 1) AS IsActive
      FROM Categories
    `);
    const categories = catRes.recordset || [];

    const prodRes = await req.query(`
      SELECT p.ProductID, p.ProductName, p.ShortDescription, p.FullDescription, p.SKU,
             p.CategoryID, c.CategoryName AS OldCategoryName
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
    `);
    const products = prodRes.recordset || [];

    const existingByNameLower = new Map(
      categories.map(c => [String(c.CategoryName || '').trim().toLowerCase(), c])
    );

    const existingSlugs = new Set(categories.map(c => String(c.CategorySlug || '').toLowerCase()).filter(Boolean));

    const ensureSlugUnique = (name) => {
      const base = slugify(name);
      let slug = base;
      let i = 1;
      while (existingSlugs.has(slug)) {
        slug = `${base}-${i++}`;
      }
      existingSlugs.add(slug);
      return slug;
    };

    const targetIds = new Map();
    let displayOrder = 1;

    for (const name of TARGET_CATEGORIES) {
      const key = name.toLowerCase();
      const existing = existingByNameLower.get(key);
      if (existing) {
        targetIds.set(name, existing.CategoryID);
        if (apply) {
          const r = new sql.Request(tx);
          r.input('CategoryID', existing.CategoryID);
          r.input('DisplayOrder', displayOrder++);
          r.input('IsActive', 1);
          await r.query(`UPDATE Categories SET IsActive = @IsActive, DisplayOrder = @DisplayOrder WHERE CategoryID = @CategoryID`);
        } else {
          displayOrder++;
        }
        continue;
      }

      const slug = ensureSlugUnique(name);
      if (apply) {
        const r = new sql.Request(tx);
        r.input('CategoryName', name);
        r.input('CategorySlug', slug);
        r.input('DisplayOrder', displayOrder++);
        const ins = await r.query(`
          INSERT INTO Categories (CategoryName, CategorySlug, ImageURL, IsActive, DisplayOrder, CreatedAt)
          OUTPUT INSERTED.CategoryID
          VALUES (@CategoryName, @CategorySlug, NULL, 1, @DisplayOrder, GETDATE())
        `);
        const id = ins.recordset[0]?.CategoryID;
        targetIds.set(name, id);
      } else {
        targetIds.set(name, -1);
        displayOrder++;
      }
    }

    const targetIdValues = new Set(Array.from(targetIds.values()).filter(v => v && v !== -1));

    const mapping = new Map();
    const countByNew = new Map();
    const sampleUnmapped = [];

    for (const p of products) {
      const newName = pickCategory({
        productName: p.ProductName,
        shortDescription: p.ShortDescription,
        fullDescription: p.FullDescription,
        sku: p.SKU,
        oldCategoryName: p.OldCategoryName
      });
      const newId = targetIds.get(newName);
      if (!newId) {
        sampleUnmapped.push({ id: p.ProductID, name: p.ProductName, old: p.OldCategoryName, picked: newName });
        continue;
      }
      mapping.set(p.ProductID, { newId, newName, old: p.OldCategoryName });
      countByNew.set(newName, (countByNew.get(newName) || 0) + 1);
    }

    console.log('Category mapping summary:');
    for (const name of TARGET_CATEGORIES) {
      console.log(`- ${name}: ${countByNew.get(name) || 0} products`);
    }
    if (sampleUnmapped.length) {
      console.log('\nUnmapped sample (missing target id):');
      console.log(sampleUnmapped.slice(0, 10));
    }

    if (apply) {
      for (const [productId, m] of mapping.entries()) {
        const r = new sql.Request(tx);
        r.input('ProductID', productId);
        r.input('CategoryID', m.newId);
        await r.query(`UPDATE Products SET CategoryID = @CategoryID WHERE ProductID = @ProductID`);
      }

      const rInact = new sql.Request(tx);
      const keepList = Array.from(targetIdValues);
      if (keepList.length) {
        keepList.forEach((id, idx) => rInact.input(`id${idx}`, id));
        const inList = keepList.map((_, idx) => `@id${idx}`).join(',');
        await rInact.query(`UPDATE Categories SET IsActive = 0 WHERE CategoryID NOT IN (${inList})`);
      }
    }

    if (apply) {
      await tx.commit();
      console.log('\nMigration applied successfully.');
    } else {
      await tx.rollback();
      console.log('\nDry-run complete (no changes committed).');
    }
  } catch (e) {
    try { await tx.rollback(); } catch (err) { void err; }
    throw e;
  }
};

main().catch((e) => {
  console.error('Category migration failed:', e);
  process.exitCode = 1;
});

