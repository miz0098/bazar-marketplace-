/** Future provider controller supplies actual SDK probes, never UA/OS-name detection.
 * No provider/merchant SDK is selected or loaded by demo checkout.
 */
export async function eligibleWallets(input: {
  secureContext: boolean;
  providerEnabled: boolean;
  providerMethods: readonly string[];
  appleCanMakePayments?: () => boolean | Promise<boolean>;
  googleIsReadyToPay?: () => boolean | Promise<boolean>;
}) {
  const probe = async (
    enabled: boolean,
    run?: () => boolean | Promise<boolean>,
  ) => {
    if (!enabled || !run) return false;
    try {
      return (await run()) === true;
    } catch {
      return false;
    }
  };
  if (!input.secureContext || !input.providerEnabled)
    return { applePay: false, googlePay: false };
  const [applePay, googlePay] = await Promise.all([
    probe(
      input.providerMethods.includes('apple-pay'),
      input.appleCanMakePayments,
    ),
    probe(
      input.providerMethods.includes('google-pay'),
      input.googleIsReadyToPay,
    ),
  ]);
  return { applePay, googlePay };
}
