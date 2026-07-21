import psycopg2
 
conn = psycopg2.connect(
    dbname="smart_task_manager",
    user="postgres",
    password="parth@2811",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()
 
print("=== BEFORE (all rows) ===")
cursor.execute("SELECT id, title, status FROM tasks")
for row in cursor.fetchall():
    print(row)
 
# DANGER: no WHERE clause at all
cursor.execute("UPDATE tasks SET status = %s", ("completed",))
print(f"\nRows updated (should be ALARMING if unintended): {cursor.rowcount}")
 
print("\n=== AFTER (all rows, before rollback) ===")
cursor.execute("SELECT id, title, status FROM tasks")
for row in cursor.fetchall():
    print(row)
 
# We never commit — we roll back immediately, undoing this mistake entirely
conn.rollback()
 
print("\n=== AFTER ROLLBACK (damage undone) ===")
cursor.execute("SELECT id, title, status FROM tasks")
for row in cursor.fetchall():
    print(row)
 
cursor.close()
conn.close()