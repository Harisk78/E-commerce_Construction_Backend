// ✅ Modified index.js for Aiven MySQL with working user register/login, products, relatedproducts, and cart endpoints
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'mysql-2ebaaef9-ecommerce-construction-1.c.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_LDkcNv993LfkzZNEvkR',
  database: 'defaultdb',
  port: 23012,
  ssl: {
    rejectUnauthorized: true
  }
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection failed:', err);
    return;
  }
  console.log('✅ Connected to Aiven MySQL');
});

// ------------------ User Register/Login ------------------
app.post('/register', (req, res) => {
  const { username, password, phone } = req.body;
  db.query(
    'INSERT INTO user_details (username, password, phone) VALUES (?, ?, ?)',
    [username, password, phone],
    err => {
      if (err) return res.status(500).json({ message: 'Error registering user', error: err });
      res.status(200).json({ message: 'User registered successfully' });
    }
  );
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM user_details WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Login error', error: err });
      if (results.length > 0) {
        const user = results[0];
        return res.status(200).json({
          message: 'Login successful',
          userId: user.id,
          username: user.username,
          phone: user.phone,
        });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  );
});

// ------------------ Products ------------------
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.post('/products', (req, res) => {
  const { name, image } = req.body;
  db.query('INSERT INTO products (name, image) VALUES (?, ?)', [name, image], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.put('/products/:id', (req, res) => {
  const { name, image } = req.body;
  db.query('UPDATE products SET name = ?, image = ? WHERE id = ?', [name, image, req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.delete('/products/:id', (req, res) => {
  db.query('DELETE FROM products WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// ------------------ Related Products ------------------
app.get('/relatedproducts/:parentid', (req, res) => {
  const parentId = req.params.parentid;
  db.query(
    'SELECT rp.*, p.name as parent_name FROM relatedproducts rp LEFT JOIN products p ON rp.parent_id = p.id WHERE rp.parent_id = ?',
    [parentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});

app.post('/relatedproducts', (req, res) => {
  const { name, image, parent_id } = req.body;
  db.query('INSERT INTO relatedproducts (name, image, parent_id) VALUES (?, ?, ?)', [name, image, parent_id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.put('/relatedproducts/:id', (req, res) => {
  const { name, image, parent_id } = req.body;
  db.query('UPDATE relatedproducts SET name = ?, image = ?, parent_id = ? WHERE id = ?', [name, image, parent_id, req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.delete('/relatedproducts/:id', (req, res) => {
  db.query('DELETE FROM relatedproducts WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// ------------------ Cart ------------------
app.post('/add-to-cart', (req, res) => {
  const { userId, productId, productName, quantity, image } = req.body;
  const imageBuffer = image?.includes(',') ? Buffer.from(image.split(',')[1], 'base64') : null;
  const query = 'INSERT INTO user_cart (user_id, product_id, product_name, quantity, image) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [userId, productId, productName, quantity, imageBuffer], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Item added to cart' });
  });
});

app.get('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  db.query('SELECT id, product_id, product_name, quantity, image FROM user_cart WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    const cart = results.map(row => ({
      id: row.id,
      productId: row.product_id,
      name: row.product_name,
      quantity: row.quantity,
      imageUrl: row.image ? `data:image/jpeg;base64,${row.image.toString('base64')}` : '',
    }));
    res.json(cart);
  });
});

app.put('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;
  db.query('UPDATE user_cart SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, userId, productId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Quantity updated' });
  });
});

app.delete('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  db.query('DELETE FROM user_cart WHERE user_id = ? AND product_id = ?', [userId, productId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Item removed from cart' });
  });
});

// ------------------ Start Server ------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
