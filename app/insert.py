import psycopg2
 
conn = psycopg2.connect(
    dbname="smart_task_manager",
    user="postgres",
    password="parth@2811",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()
 
cursor.execute(
    "INSERT INTO tasks (title, priority) VALUES (%s, %s)",
    ("Buy groceries", "low")
)
cursor.execute(
    "INSERT INTO tasks (title, priority) VALUES (%s, %s)",
    ("Fix production bug", "high")
)
conn.commit()
 
print("Two more tasks inserted")
 
cursor.close()
conn.close()