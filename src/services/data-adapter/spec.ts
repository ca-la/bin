import { test, Test } from '../../test-helpers/fresh';
import DataAdapter from '.';

interface Person {
  name: string;
  address: {
    firstLine: string;
  };
}
interface PersonSnake {
  name: string;
  address: {
    first_line: string;
  };
}

const person: Person = {
  address: {
    firstLine: '123 Main St'
  },
  name: 'John Doe'
};
const personFromDb: PersonSnake = {
  address: {
    first_line: '123 Main St'
  },
  name: 'John Doe'
};

test('DataAdapter class', async (t: Test) => {
  const adapter = new DataAdapter<PersonSnake, Person>();
  t.deepEqual(
    adapter.parse(personFromDb),
    person,
    '#parse correctly parses row type to interface'
  );
  t.deepEqual(
    adapter.toDb(person),
    personFromDb,
    '#toDb correctly remaps to row type'
  );
  t.deepEqual(
    adapter.parse(adapter.toDb(person)),
    person,
    'returns equivalent object'
  );
  t.deepEqual(
    adapter.toDb(adapter.parse(personFromDb)),
    personFromDb,
    'returns equivalent object'
  );
});

test('with custom key transformer', async (t: Test) => {
  const alEspañol = (key: string): string => {
    const mapping = {
      address: 'dirección',
      first_line: 'primeraLinea',
      name: 'nombre'
    };
    return (mapping as any)[key] || key;
  };
  const adapter = new DataAdapter<PersonSnake, {}>(alEspañol);

  t.deepEqual(
    adapter.parse(personFromDb),
    {
      dirección: {
        primeraLinea: '123 Main St'
      },
      nombre: 'John Doe'
    },
    'applies the key transformer'
  );
});
