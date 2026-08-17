import PDFDocument from "pdfkit";

import {
  ModePaiement,
  NatureDemande,
} from "@prisma/client";

import type {
  PaiementComplementaireRepository,
} from "../repositories/paiement-complementaire.repository";

/**
 * Paiement complémentaire complet retourné par
 * PaiementComplementaireRepository.findLatestByDemandeId().
 */
type PaiementComplementaireRecuData =
  NonNullable<
    Awaited<
      ReturnType<
        PaiementComplementaireRepository["findLatestByDemandeId"]
      >
    >
  >;

export class RecuPaiementComplementaireService {
  private static readonly BRAND_COLOR =
    "#0A4A46";

  private static readonly TEXT_COLOR =
    "#202124";

  private static readonly SECONDARY_COLOR =
    "#5F6368";

  private static readonly BORDER_COLOR =
    "#D5DDDC";

  private static readonly SOFT_BACKGROUND =
    "#F4F8F7";

  private formatMontant(
    value: {
      toString(): string;
    }
  ): string {
    const numericValue =
      Number(
        value.toString()
      );

    if (
      Number.isNaN(
        numericValue
      )
    ) {
      return `${value.toString()} DT`;
    }

    return `${numericValue
      .toFixed(3)
      .replace(".", ",")} DT`;
  }

  private formatDateTime(
    value: Date
  ): string {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(value);
  }

  private formatModePaiement(
    modePaiement: ModePaiement
  ): string {
    switch (modePaiement) {
      case ModePaiement.ESPECES:
      default:
        return "Espèces";
    }
  }

  private formatNature(
    nature: NatureDemande | null
  ): string {
    switch (nature) {
      case NatureDemande.INSCRIPTION:
        return "Inscription foncière";

      case NatureDemande.PRESTATION:
        return "Prestation";

      default:
        return "Ancien modèle";
    }
  }

  private ensureSpace(
    document: PDFKit.PDFDocument,
    requiredHeight = 80
  ): void {
    const bottomLimit =
      document.page.height -
      document.page.margins.bottom;

    if (
      document.y +
        requiredHeight >
      bottomLimit
    ) {
      document.addPage();
    }
  }

  private writeSectionTitle(
    document: PDFKit.PDFDocument,
    title: string
  ): void {
    this.ensureSpace(
      document,
      55
    );

    const leftMargin =
      document.page.margins.left;

    const rightLimit =
      document.page.width -
      document.page.margins.right;

    document.moveDown(
      0.5
    );

    document
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(
        RecuPaiementComplementaireService
          .BRAND_COLOR
      )
      .text(
        title
      );

    const lineY =
      document.y + 2;

    document
      .moveTo(
        leftMargin,
        lineY
      )
      .lineTo(
        rightLimit,
        lineY
      )
      .lineWidth(0.8)
      .strokeColor(
        RecuPaiementComplementaireService
          .BORDER_COLOR
      )
      .stroke();

    document.moveDown(
      0.7
    );
  }

  private writeRow(
    document: PDFKit.PDFDocument,
    label: string,
    value: string
  ): void {
    this.ensureSpace(
      document,
      35
    );

    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(
        RecuPaiementComplementaireService
          .TEXT_COLOR
      )
      .text(
        `${label} : `,
        {
          continued: true,
        }
      );

    document
      .font("Helvetica")
      .fillColor(
        RecuPaiementComplementaireService
          .TEXT_COLOR
      )
      .text(
        value
      );

    document.moveDown(
      0.25
    );
  }

  private writeOperations(
    document: PDFKit.PDFDocument,
    paiement: PaiementComplementaireRecuData
  ): void {
    const operations =
      paiement.demande
        .operationsFoncieres
        .map(
          (item) =>
            item
              .typeOperationFonciere
              .libelle
        );

    this.writeRow(
      document,
      "Opération(s) après correction",
      operations.length > 0
        ? operations.join(", ")
        : "Aucune opération"
    );
  }

  private renderReceipt(
    document: PDFKit.PDFDocument,
    paiement: PaiementComplementaireRecuData
  ): void {
    const leftMargin =
      document.page.margins.left;

    const rightMargin =
      document.page.margins.right;

    const contentWidth =
      document.page.width -
      leftMargin -
      rightMargin;

    document
      .rect(
        0,
        0,
        document.page.width,
        10
      )
      .fill(
        RecuPaiementComplementaireService
          .BRAND_COLOR
      );

    document
      .fillColor(
        RecuPaiementComplementaireService
          .BRAND_COLOR
      )
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(
        "OFFICE NATIONAL DE LA PROPRIÉTÉ FONCIÈRE",
        {
          align: "center",
        }
      );

    document.moveDown(
      0.3
    );

    document
      .fillColor(
        RecuPaiementComplementaireService
          .SECONDARY_COLOR
      )
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Système d'automatisation des inscriptions foncières",
        {
          align: "center",
        }
      );

    document.moveDown(
      1
    );

    document
      .fillColor(
        RecuPaiementComplementaireService
          .TEXT_COLOR
      )
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(
        "REÇU DE PAIEMENT COMPLÉMENTAIRE",
        {
          align: "center",
        }
      );

    document.moveDown(
      1
    );

    const receiptBoxY =
      document.y;

    document
      .roundedRect(
        leftMargin,
        receiptBoxY,
        contentWidth,
        72,
        6
      )
      .lineWidth(1)
      .strokeColor(
        RecuPaiementComplementaireService
          .BORDER_COLOR
      )
      .stroke();

    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(
        RecuPaiementComplementaireService
          .SECONDARY_COLOR
      )
      .text(
        "Numéro du reçu",
        leftMargin + 15,
        receiptBoxY + 14
      );

    document
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(
        RecuPaiementComplementaireService
          .BRAND_COLOR
      )
      .text(
        paiement.numeroRecu,
        leftMargin + 170,
        receiptBoxY + 13,
        {
          width:
            contentWidth - 185,
          align: "right",
        }
      );

    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(
        RecuPaiementComplementaireService
          .SECONDARY_COLOR
      )
      .text(
        "Date du paiement",
        leftMargin + 15,
        receiptBoxY + 43
      );

    document
      .font("Helvetica")
      .fontSize(10)
      .fillColor(
        RecuPaiementComplementaireService
          .TEXT_COLOR
      )
      .text(
        this.formatDateTime(
          paiement.datePaiement
        ),
        leftMargin + 170,
        receiptBoxY + 43,
        {
          width:
            contentWidth - 185,
          align: "right",
        }
      );

    document.y =
      receiptBoxY + 88;

    this.writeSectionTitle(
      document,
      "Informations de la demande"
    );

    this.writeRow(
      document,
      "Numéro de la demande",
      paiement.demande.numero
    );

    this.writeRow(
      document,
      "Demandeur",
      `${paiement.demande.prenomDemandeur} ${paiement.demande.nomDemandeur}`
    );

    this.writeRow(
      document,
      "Numéro CIN",
      paiement.demande.cin
    );

    this.writeRow(
      document,
      "Nature",
      this.formatNature(
        paiement.demande.nature
      )
    );

    if (
      paiement.demande
        .titreFoncier
    ) {
      this.writeRow(
        document,
        "Numéro du titre foncier",
        paiement.demande
          .titreFoncier
          .numero
      );

      this.writeRow(
        document,
        "Gouvernorat",
        paiement.demande
          .titreFoncier
          .gouvernorat
          .nom
      );
    }

    if (
      paiement.demande.nature ===
      NatureDemande.INSCRIPTION
    ) {
      this.writeOperations(
        document,
        paiement
      );
    }

    this.writeSectionTitle(
      document,
      "Régularisation tarifaire"
    );

    this.writeRow(
      document,
      "Révision",
      `N° ${paiement.revision.numeroRevision}`
    );

    if (
      paiement.demande
        .tarification
    ) {
      this.writeRow(
        document,
        "Paiement initial",
        this.formatMontant(
          paiement.demande
            .tarification
            .montantTotal
        )
      );
    }

    this.writeRow(
      document,
      "Montant avant correction",
      this.formatMontant(
        paiement.revision
          .montantAvant
      )
    );

    this.writeRow(
      document,
      "Montant après correction",
      this.formatMontant(
        paiement.revision
          .montantApres
      )
    );

    this.writeRow(
      document,
      "Complément dû",
      this.formatMontant(
        paiement.revision
          .complementDu
      )
    );

    this.writeRow(
      document,
      "Référence réglementaire",
     paiement.revision.referenceReglementaire ?? "Non renseignée"
    );

    if (
      paiement.revision.motif
    ) {
      this.writeRow(
        document,
        "Motif de la correction",
        paiement.revision.motif
      );
    }

    this.writeSectionTitle(
      document,
      "Encaissement du complément"
    );

    this.writeRow(
      document,
      "Mode de paiement",
      this.formatModePaiement(
        paiement.modePaiement
      )
    );

    this.writeRow(
      document,
      "Montant exigible",
      this.formatMontant(
        paiement.montantExigible
      )
    );

    this.writeRow(
      document,
      "Montant remis",
      this.formatMontant(
        paiement.montantRemis
      )
    );

    this.writeRow(
      document,
      "Monnaie rendue",
      this.formatMontant(
        paiement.monnaieRendue
      )
    );

    this.ensureSpace(
      document,
      80
    );

    document.moveDown(
      0.5
    );

    const totalBoxY =
      document.y;

    document
      .roundedRect(
        leftMargin,
        totalBoxY,
        contentWidth,
        54,
        6
      )
      .fill(
        "#E8F3F2"
      );

    document
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(
        RecuPaiementComplementaireService
          .BRAND_COLOR
      )
      .text(
        "COMPLÉMENT ENCAISSÉ",
        leftMargin + 15,
        totalBoxY + 11
      );

    document
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(
        RecuPaiementComplementaireService
          .BRAND_COLOR
      )
      .text(
        this.formatMontant(
          paiement.montantEncaisse
        ),
        leftMargin + 230,
        totalBoxY + 18,
        {
          width:
            contentWidth - 245,
          align: "right",
        }
      );

    document.y =
      totalBoxY + 68;

    this.writeSectionTitle(
      document,
      "Informations de la caisse"
    );

    this.writeRow(
      document,
      "Caissier",
      `${paiement.caissier.prenom} ${paiement.caissier.nom}`
    );

    this.writeRow(
      document,
      "Identifiant du caissier",
      paiement.caissier.login
    );

    if (
      paiement.journalCaisse
    ) {
      this.writeRow(
        document,
        "Journal de caisse",
        paiement.journalCaisse.numero
      );
    }

    if (
      paiement.observations
    ) {
      this.writeRow(
        document,
        "Observations",
        paiement.observations
      );
    }

    this.ensureSpace(
      document,
      60
    );

    document.moveDown(
      1
    );

    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor(
        RecuPaiementComplementaireService
          .SECONDARY_COLOR
      )
      .text(
        "Ce reçu justifie uniquement l'encaissement du complément tarifaire lié à la révision indiquée ci-dessus.",
        {
          align: "center",
        }
      );

    document.moveDown(
      0.3
    );

    document.text(
      "Document généré automatiquement par le système de gestion des inscriptions foncières.",
      {
        align: "center",
      }
    );
  }

  async generate(
    paiement: PaiementComplementaireRecuData
  ): Promise<Buffer> {
    return new Promise<Buffer>(
      (
        resolve,
        reject
      ) => {
        const chunks:
          Buffer[] = [];

        const document =
          new PDFDocument({
            size: "A4",

            margins: {
              top: 35,
              right: 50,
              bottom: 35,
              left: 50,
            },

            info: {
              Title:
                `Reçu complémentaire ${paiement.numeroRecu}`,

              Author:
                "Office National de la Propriété Foncière",

              Subject:
                `Complément de paiement de la demande ${paiement.demande.numero}`,
            },
          });

        document.on(
          "data",
          (
            chunk:
              Uint8Array
          ) => {
            chunks.push(
              Buffer.from(
                chunk
              )
            );
          }
        );

        document.on(
          "end",
          () => {
            resolve(
              Buffer.concat(
                chunks
              )
            );
          }
        );

        document.on(
          "error",
          (
            error:
              Error
          ) => {
            reject(
              error
            );
          }
        );

        try {
          this.renderReceipt(
            document,
            paiement
          );

          document.end();
        } catch (error) {
          reject(
            error
          );
        }
      }
    );
  }
}
