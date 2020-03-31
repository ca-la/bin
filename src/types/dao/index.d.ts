type DaoCreate<T> = (data: any) => Promise<T>;
type DaoUpdate<T> = (id: string, data: any) => Promise<T>;
type DaoDeleteById<T> = (id: string) => Promise<T>;
type DaoFindById<T> = (id: string) => Promise<T>;
type DaoValidate = (data: any) => void;

interface DAO<T> {
  create: DaoCreate<T>;
  update: DaoUpdate<T>;
  deleteById: DaoDeleteById<T>;
  findById: DaoFindById<T>;
  validate: DaoValidate;
}
