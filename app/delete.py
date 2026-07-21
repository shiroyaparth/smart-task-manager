import psycopg2
 
conn = psycopg2.connect(
    dbname="smart_task_manager",
    user="postgres",
    password="parth@2811",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()
 
print("=== BEFORE DELETE ===")
cursor.execute("SELECT id, title FROM tasks")
for row in cursor.fetchall():
    print(row)
 
cursor.execute("DELETE FROM tasks WHERE id = %s", (4,))
conn.commit()
print(f"\nRows deleted: {cursor.rowcount}")
 
print("\n=== AFTER DELETE ===")
cursor.execute("SELECT id, title FROM tasks")
for row in cursor.fetchall():
    print(row)
 
print("\n=== DELETE AGAIN, SAME id (already gone) ===")
cursor.execute("DELETE FROM tasks WHERE id = %s", (4,))
conn.commit()
print(f"Rows deleted: {cursor.rowcount}")
 
cursor.close()
conn.close()