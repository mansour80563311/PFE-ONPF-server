import PDFDocument from "pdfkit";

import {
  LangueCertificat,
  ModePaiement,
} from "@prisma/client";

import type {
  PaiementRepository,
} from "../repositories/paiement.repository";

/*
 * Type correspondant au paiement complet
 * retourné par PaiementRepository.findById().
 */
type PaiementRecuData =
  NonNullable<
    Awaited<
      ReturnType<
        PaiementRepository["findById"]
      >
    >
  >;

export class RecuPaiementService {
  private static readonly BRAND_COLOR =
    "#0A4A46";

  private static readonly TEXT_COLOR =
    "#202124";

  private static readonly SECONDARY_COLOR =
    "#5F6368";

  private static readonly BORDER_COLOR =
    "#D5DDDC";

  /**
   * Formate un montant monétaire
   * avec trois chiffres après la virgule.
   *
   * Exemple :
   * 130 -> 130,000 DT
   */
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

  /**
   * Formate la date et l’heure
   * du paiement.
   */
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

  /**
   * Transforme la langue enregistrée
   * en libellé lisible.
   */
  private formatLangue(
    langue: LangueCertificat
  ): string {
    switch (langue) {
      case LangueCertificat.ARABE:
        return "Arabe";

      case LangueCertificat.ANGLAIS:
        return "Anglais";

      case LangueCertificat.FRANCAIS:
      default:
        return "Français";
    }
  }

  /**
   * Transforme le mode de paiement
   * en libellé lisible.
   */
  private formatModePaiement(
    modePaiement: ModePaiement
  ): string {
    switch (modePaiement) {
      case ModePaiement.ESPECES:
      default:
        return "Espèces";
    }
  }

  /**
   * Ajoute le titre d’une section
   * dans le document PDF.
   */
  private writeSectionTitle(
    document: PDFKit.PDFDocument,
    title: string
  ): void {
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
        RecuPaiementService
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
        RecuPaiementService
          .BORDER_COLOR
      )
      .stroke();

    document.moveDown(
      0.7
    );
  }

  /**
   * Ajoute une ligne libellé/valeur
   * dans le reçu.
   */
  private writeRow(
    document: PDFKit.PDFDocument,
    label: string,
    value: string
  ): void {
    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(
        RecuPaiementService
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
        RecuPaiementService
          .TEXT_COLOR
      )
      .text(
        value
      );

    document.moveDown(
      0.25
    );
  }

  /**
   * Dessine le contenu complet
   * du reçu.
   */
  private renderReceipt(
    document: PDFKit.PDFDocument,
    paiement: PaiementRecuData
  ): void {
    const leftMargin =
      document.page.margins.left;

    const rightMargin =
      document.page.margins.right;

    const contentWidth =
      document.page.width -
      leftMargin -
      rightMargin;

    /*
     * Bande supérieure.
     */
    document
      .rect(
        0,
        0,
        document.page.width,
        10
      )
      .fill(
        RecuPaiementService
          .BRAND_COLOR
      );

    /*
     * En-tête.
     */
    document
      .fillColor(
        RecuPaiementService
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
        RecuPaiementService
          .SECONDARY_COLOR
      )
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Système d’automatisation des inscriptions foncières",
        {
          align: "center",
        }
      );

    document.moveDown(
      1
    );

    document
      .fillColor(
        RecuPaiementService
          .TEXT_COLOR
      )
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(
        "REÇU DE PAIEMENT",
        {
          align: "center",
        }
      );

    document.moveDown(
      1
    );

    /*
     * Cadre d’identification du reçu.
     */
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
        RecuPaiementService
          .BORDER_COLOR
      )
      .stroke();

    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(
        RecuPaiementService
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
        RecuPaiementService
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
        RecuPaiementService
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
        RecuPaiementService
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

    /*
     * Informations du demandeur.
     */
    this.writeSectionTitle(
      document,
      "Informations du demandeur"
    );

    this.writeRow(
      document,
      "Nom et prénom",
      `${paiement.demande.prenomDemandeur} ${paiement.demande.nomDemandeur}`
    );

    this.writeRow(
      document,
      "Numéro CIN",
      paiement.demande.cin
    );

    this.writeRow(
      document,
      "Téléphone",
      paiement.demande.telephone
    );

    if (
      paiement.demande.email
    ) {
      this.writeRow(
        document,
        "Adresse électronique",
        paiement.demande.email
      );
    }

    /*
     * Informations de la demande.
     */
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
      "Référence foncière",
      paiement.demande
        .referenceFonciere
    );

    this.writeRow(
      document,
      "Adresse du bien",
      paiement.demande
        .adresseBien
    );

    /*
     * Informations tarifaires.
     */
    this.writeSectionTitle(
      document,
      "Détails de la prestation"
    );

    this.writeRow(
      document,
      "Nombre d’exemplaires",
      String(
        paiement.demande
          .nombreExemplaires
      )
    );

    this.writeRow(
      document,
      "Langue du certificat",
      this.formatLangue(
        paiement.demande
          .langueCertificat
      )
    );

    this.writeRow(
      document,
      "Traduction demandée",
      paiement.demande
        .traductionDemandee
        ? "Oui"
        : "Non"
    );

    this.writeRow(
      document,
      "Prix unitaire",
      this.formatMontant(
        paiement.demande
          .prixUnitaire
      )
    );

    this.writeRow(
      document,
      "Supplément de traduction",
      this.formatMontant(
        paiement.demande
          .supplementTraduction
      )
    );

    /*
     * Informations d’encaissement.
     */
    this.writeSectionTitle(
      document,
      "Encaissement"
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

    /*
     * Cadre du montant encaissé.
     */
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
        RecuPaiementService
          .BRAND_COLOR
      )
      .text(
        "MONTANT ENCAISSÉ",
        leftMargin + 15,
        totalBoxY + 11
      );

    document
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(
        RecuPaiementService
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

    /*
     * Informations du caissier.
     */
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
      paiement.observations
    ) {
      this.writeRow(
        document,
        "Observations",
        paiement.observations
      );
    }

    /*
     * Pied de page.
     */
    document.moveDown(
      1
    );

    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor(
        RecuPaiementService
          .SECONDARY_COLOR
      )
      .text(
        "Ce reçu a été généré automatiquement par le système de gestion des inscriptions foncières.",
        {
          align: "center",
        }
      );

    document.moveDown(
      0.3
    );

    document.text(
      "Document à conserver comme justificatif de paiement.",
      {
        align: "center",
      }
    );
  }

  /**
   * Génère le reçu sous forme de Buffer.
   *
   * Le fichier n’est pas stocké de manière
   * permanente sur le serveur.
   */
  async generate(
    paiement: PaiementRecuData
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
                `Reçu ${paiement.numeroRecu}`,

              Author:
                "Office National de la Propriété Foncière",

              Subject:
                `Paiement de la demande ${paiement.demande.numero}`,
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