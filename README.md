# Stiliza

Pagina de vestidos (cliente, empleado y dueno).
Backend: Supabase.

## Config
Editar `js/supabase-config.js` con la URL y anon key del proyecto.

## Base de datos
Ejecutar `supabase_schema.sql` en el SQL Editor de Supabase.

## Dueño
Crear usuario en Authentication y actualizar el role:

```sql
update public.profiles
set role = 'dueno', full_name = 'Dueno Stiliza'
where email = 'dueno@stiliza.com';
```
