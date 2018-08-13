import FitPartner from '../../domain-objects/fit-partner';

type UnsavedPartner = Unsaved<FitPartner>;

declare namespace FitPartnersDAO {
  function findById(id: string): Promise<FitPartner | null>;
  function create(data: UnsavedPartner): Promise<FitPartner>;
}

export = FitPartnersDAO;
