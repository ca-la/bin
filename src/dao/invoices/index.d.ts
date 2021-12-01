import Knex from "knex";
import Invoice from "../../domain-objects/invoice";

declare namespace InvoicesDAO {
  function createTrx(
    trx: Knex.Transaction,
    data: Partial<Invoice>
  ): Promise<Invoice | null>;
  function findByCollection(
    collectionId: string,
    ktx?: Knex
  ): Promise<Invoice[]>;
  function findById(id: string): Promise<Invoice | null>;
  function findByUser(userId: string): Promise<Invoice[]>;
  function findByIdTrx(
    trx: Knex.Transaction,
    id: string
  ): Promise<Invoice | null>;
}

export = InvoicesDAO;
