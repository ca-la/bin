import * as db from '../../services/db';

export const VIEW_RAW = db.raw(`
SELECT collaboratorsForCollaboratorsViewRaw.*,
to_json(usersForCollaboratorsViewRaw.*) as user
FROM collaborators AS collaboratorsForCollaboratorsViewRaw
LEFT JOIN users AS usersForCollaboratorsViewRaw
  on usersForCollaboratorsViewRaw.id = collaboratorsForCollaboratorsViewRaw.user_id
`);
