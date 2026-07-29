export interface IdentiteCni {
  cin: string;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  adresse: string;
  referenceVerification: string;
}

const identitesSimulees: Readonly<
  Record<string, IdentiteCni>
> = {
  "12345678": {
    cin: "12345678",
    nom: "BEN SALEM",
    prenom: "Mohamed",
    dateNaissance: new Date(
      "1995-04-12T00:00:00.000Z"
    ),
    adresse: "Tunis",
    referenceVerification:
      "CNI-MOCK-12345678",
  },

  "87654321": {
    cin: "87654321",
    nom: "TRABELSI",
    prenom: "Amira",
    dateNaissance: new Date(
      "1998-09-23T00:00:00.000Z"
    ),
    adresse: "Ariana",
    referenceVerification:
      "CNI-MOCK-87654321",
  },

  "11223344": {
    cin: "11223344",
    nom: "MANSOUR",
    prenom: "Youssef",
    dateNaissance: new Date(
      "1987-01-16T00:00:00.000Z"
    ),
    adresse: "Ben Arous",
    referenceVerification:
      "CNI-MOCK-11223344",
  },
};

export class CniService {
  async verifierIdentite(
    cin: string
  ): Promise<IdentiteCni | null> {
    /*
     * Petit délai simulant l’appel à un
     * Web Service externe.
     */
    await new Promise<void>(
      (resolve) => {
        setTimeout(resolve, 300);
      }
    );

    const identite =
      identitesSimulees[cin];

    if (!identite) {
      return null;
    }

    /*
     * On retourne une copie pour empêcher
     * toute modification des données simulées.
     */
    return {
      ...identite,
      dateNaissance: new Date(
        identite.dateNaissance
      ),
    };
  }
}