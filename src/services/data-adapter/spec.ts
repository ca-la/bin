import { test, Test } from '../../test-helpers/simple';
import DataAdapter from '.';

interface Person {
  name: string;
  address: {
    firstLine: string;
  };
  email: { address: string; validated: boolean }[];
}
interface PersonSnake {
  name: string;
  address: {
    first_line: string;
  };
  email: { address: string; validated: boolean }[];
}

const person: Person = {
  address: {
    firstLine: '123 Main St'
  },
  email: [{ address: 'john@doe.corp', validated: false }],
  name: 'John Doe'
};
const personFromDb: PersonSnake = {
  address: {
    first_line: '123 Main St'
  },
  email: [{ address: 'john@doe.corp', validated: false }],
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

test('with custom codec', async (t: Test) => {
  const loud = (p: PersonSnake): Person => {
    return {
      address: {
        firstLine: p.address.first_line.toUpperCase()
      },
      email: p.email.map((e: { address: string; validated: boolean }) => ({
        address: e.address.toUpperCase(),
        validated: e.validated
      })),
      name: p.name.toUpperCase()
    };
  };
  const quiet = (p: Person): PersonSnake => {
    return {
      address: {
        first_line: p.address.firstLine.toLowerCase()
      },
      email: p.email.map((e: { address: string; validated: boolean }) => ({
        address: e.address.toLowerCase(),
        validated: e.validated
      })),
      name: p.name.toLowerCase()
    };
  };
  const adapter = new DataAdapter<PersonSnake, Person>(loud, quiet, quiet);
  t.deepEqual(
    adapter.parse(personFromDb),
    {
      address: {
        firstLine: '123 MAIN ST'
      },
      email: [{ address: 'JOHN@DOE.CORP', validated: false }],
      name: 'JOHN DOE'
    },
    '#parse applies the custom encoder'
  );
  t.deepEqual(
    adapter.toDb(person),
    {
      address: {
        first_line: '123 main st'
      },
      email: [{ address: 'john@doe.corp', validated: false }],
      name: 'john doe'
    },
    '#toDb applies the decoder'
  );
  t.deepEqual(
    adapter.forInsertion(person),
    {
      address: {
        first_line: '123 main st'
      },
      email: [{ address: 'john@doe.corp', validated: false }],
      name: 'john doe'
    },
    '#forInsertion applies the decoder'
  );
});
