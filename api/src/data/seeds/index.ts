import { sqldb } from "..";
import { DB_SCHEMA } from "../../config";

export async function seedUp() {
  console.log("Seeding");

  await sqldb("user").update({ roles: "BranchUser" }).whereRaw("1=1");
  await sqldb("user").update({ first_name: "Max",    last_name: "Parker",   display_name: "Max.Parker",      status: "Active", roles: "Admin" }).where({ email: "Max.parker@yukon.ca" });
  await sqldb("user").update({ first_name: "Diedre", last_name: "Davidson", display_name: "Diedre.Davidson", status: "Active", roles: "Admin" }).where({ email: "dpdavids@ynet.gov.yk.ca" });
  await sqldb("user").update({ first_name: "Diedre", last_name: "Davidson", display_name: "Diedre.Davidson", status: "Active", roles: "Admin" }).where({ email: "Diedre.Davidson@yukon.ca" });
  await sqldb("user").update({ first_name: "Hassan", last_name: "Anvar",    display_name: "Hassan.Anvar",    status: "Active", roles: "Admin" }).where({ email: "hassan.anvar@pacificintelligent.com" });

  await rolesUp()
}

export async function rolesUp() {
  console.log("----Seeding Roles----");
  try {
    await sqldb("Role").delete().whereRaw("1=1");
    await insertIntoTable("Role", [
      { id: 1, name: "System Admin", role: "Admin" },
      { id: 2, name: "Branch User", role: "BranchUser" },
      { id: 3, name: "Branch Agent", role: "BranchAgent" },
      { id: 4, name: "Branch Supervisor", role: "BranchAdmin" },
      { id: 5, name: "ICT Finance", role: "IctFinance" },
      { id: 6, name: "Departmental Finance", role: "DeptFinance" }
    ]);
  } catch (e) {}
}

async function insertIntoTable(table: string, data: any) {
  const schema = DB_SCHEMA;
  const { bindings, sql } = sqldb.withSchema(schema).insert(data).into(table).toSQL();

  const newQuery = `SET IDENTITY_INSERT ${schema}.${table} ON; ${sql} SET IDENTITY_INSERT ${schema}.${table} OFF;`;

  return await sqldb.raw(newQuery, bindings);
}
