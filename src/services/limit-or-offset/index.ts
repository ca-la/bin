import Knex from 'knex';

export default function limitOrOffset(
  limit?: number,
  offset?: number
): (query: Knex.QueryBuilder) => void {
  return (query: Knex.QueryBuilder): void => {
    if (limit) {
      query.limit(limit);
    }
    if (offset) {
      query.offset(offset);
    }
  };
}
