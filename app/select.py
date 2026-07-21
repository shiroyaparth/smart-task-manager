import psycopg2
 
conn = psycopg2.connect(
    dbname="smart_task_manager",
    user="postgres",
    password="parth@2811",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()
 
print("=== ALL TASKS ===")
cursor.execute("SELECT * FROM tasks")
rows = cursor.fetchall()
for row in rows:
    print(row)
 
print("\n=== ONLY HIGH PRIORITY TASKS ===")
cursor.execute("SELECT * FROM tasks WHERE priority = %s", ("high",))
rows = cursor.fetchall()
for row in rows:
    print(row)
 
print("\n=== ONLY id AND title, PENDING TASKS ===")
cursor.execute("SELECT id, title FROM tasks WHERE status = %s", ("pending",))
rows = cursor.fetchall()
for row in rows:
    print(row)
 
cursor.close()
conn.close()