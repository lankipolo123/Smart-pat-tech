import sqlite3
conn = sqlite3.connect('smartpat.db')
conn.execute('UPDATE cameras SET is_active=0')
conn.commit()
conn.close()
print('Done')