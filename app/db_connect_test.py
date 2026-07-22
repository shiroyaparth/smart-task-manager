import psycopg2
 
conn = psycopg2.connect(
    dbname="smart_task_manager",
    user="postgres",
    password="parth2811",
    host="localhost",
    port="5432"
)
 
print("Database Connected Successfully")
 
conn.close()
