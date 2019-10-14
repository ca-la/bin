import * as uuid from 'node-uuid';
import { formatCentsToDollars, NotificationMessage } from '@cala/ts-lib';

import MonthlySalesReport from '../../components/sales-reports/domain-object';
import { findById as findUser } from '../../components/users/dao';
import * as EmailService from '../../services/email';
import { STUDIO_HOST } from '../../config';

const LEFT_STYLE = 'text-align:left;width:50%;padding-right:4px;';
const RIGHT_STYLE =
  'text-align:right;font-weight:bold;width:50%;padding-left:4px;';

function constructRow(label: string, value: string): string {
  return `
    <tr>
      <td style='${LEFT_STYLE}'>${label}</td>
      <td style='${RIGHT_STYLE}'>${value}</td>
    </tr>
  `;
}

/**
 * Immediately sends a notification about the monthly sales report.
 * Note: this does not persist the Notification into the database!
 */
export async function immediatelySendMonthlySalesReport(
  salesReport: MonthlySalesReport
): Promise<NotificationMessage> {
  const recipientUser = await findUser(salesReport.designerId);
  const actor = await findUser(salesReport.createdBy);

  if (!recipientUser) {
    throw new Error(`Unknown user ${salesReport.designerId}`);
  }

  const message: NotificationMessage = {
    id: uuid.v4(),
    title: 'Monthly Sales Report',
    html: `
      <table style='margin:auto;'>
        ${constructRow(
          'Available Credit',
          formatCentsToDollars(salesReport.availableCreditCents)
        )}
        ${constructRow(
          'Cost of Returned Goods',
          formatCentsToDollars(salesReport.costOfReturnedGoodsCents)
        )}
        ${constructRow(
          'Financing Balance',
          formatCentsToDollars(salesReport.financingBalanceCents)
        )}
        ${constructRow(
          'Financing Principal Paid',
          formatCentsToDollars(salesReport.financingPrincipalPaidCents)
        )}
        ${constructRow(
          'Fulfillment Cost',
          formatCentsToDollars(salesReport.fulfillmentCostCents)
        )}
        ${constructRow(
          'Paid Out To You',
          formatCentsToDollars(salesReport.paidToDesignerCents)
        )}
        ${constructRow(
          'Revenue',
          formatCentsToDollars(salesReport.revenueCents)
        )}
        ${constructRow(
          'Revenue Shared with CALA',
          `${salesReport.revenueSharePercentage}%`
        )}
      </table>
    `,
    readAt: null,
    link: STUDIO_HOST,
    createdAt: new Date(),
    actor,
    imageUrl: null,
    location: [],
    attachments: [],
    actions: []
  };

  await EmailService.enqueueSend({
    params: {
      notification: message
    },
    templateName: 'single_notification',
    to: recipientUser.email
  });

  return message;
}
