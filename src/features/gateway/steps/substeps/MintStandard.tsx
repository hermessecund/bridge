import { Box, Grow, Typography } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { Gateway } from "@renproject/ren";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RouteComponentProps } from "react-router";
import QRCode from "qrcode.react";
import {
  BigQrCode,
  CopyContentButton,
  QrCodeIconButton,
  ToggleIconButton,
  TransactionDetailsButton,
} from "../../../../components/buttons/Buttons";
import { NumberFormatText } from "../../../../components/formatting/NumberFormatText";
import {
  BigTopWrapper,
  CenteringSpacedBox,
  MediumWrapper,
} from "../../../../components/layout/LayoutHelpers";
import {
  PaperActions,
  PaperContent,
  PaperHeader,
  PaperNav,
  PaperTitle,
} from "../../../../components/layout/Paper";
import {
  ProgressWithContent,
  ProgressWrapper,
} from "../../../../components/progress/ProgressHelpers";
import { BigAssetAmount } from "../../../../components/typography/TypographyHelpers";
import { Debug } from "../../../../components/utils/Debug";
import { useNotifications } from "../../../../providers/Notifications";
import {
  usePaperTitle,
  useSetPaperTitle,
} from "../../../../providers/TitleProviders";
import { orangeLight } from "../../../../theme/colors";
import { getChainConfig } from "../../../../utils/chainsConfig";
import { getHours } from "../../../../utils/dates";
import { trimAddress } from "../../../../utils/strings";
import { getAssetConfig } from "../../../../utils/tokensConfig";
import { $network } from "../../../network/networkSlice";
import { BrowserNotificationButton } from "../../../notifications/components/NotificationsHelpers";
import {
  useBrowserNotifications,
  useBrowserNotificationsConfirmation,
} from "../../../notifications/notificationsUtils";
import {
  HMSCountdown,
  ProgressStatus,
} from "../../../transactions/components/TransactionsHelpers";
import { ConnectWalletPaperSection } from "../../../wallet/components/WalletHelpers";
import {
  useCurrentChainWallet,
  useSyncWalletChain,
  useWallet,
} from "../../../wallet/walletHooks";
import { getPaymentLink } from "../../../wallet/walletUtils";
import { GatewayAddressValidityMessage } from "../../components/MintHelpers";
import { useGateway, useGatewayFees } from "../../gatewayHooks";
import { parseGatewayQueryString } from "../../gatewayUtils";
import { useGatewayMenuControl } from "../gatewayUiHooks";
import { Asset, Chain } from "@renproject/chains";

export const MintStandardProcess: FunctionComponent<RouteComponentProps> = ({
  location,
}) => {
  const [paperTitle] = usePaperTitle();
  const {
    // modalOpened,
    handleModalOpen,
    handleModalClose,
    tooltipOpened,
    handleTooltipClose,
  } = useBrowserNotificationsConfirmation();
  const { network } = useSelector($network);
  const { enabled } = useBrowserNotifications(handleModalClose);
  const { menuOpened, handleMenuOpen } = useGatewayMenuControl();
  const gatewayParams = parseGatewayQueryString(location.search);
  const { asset, from, to, nonce } = gatewayParams;

  useSyncWalletChain(to);
  const { connected, provider } = useWallet(to);
  const { gateway } = useGateway({ asset, from, to, nonce, network }, provider);
  const fees = useGatewayFees(gateway);
  const { minimumAmount } = fees;
  return (
    <>
      <PaperHeader>
        <PaperNav />
        <PaperTitle>{paperTitle}</PaperTitle>
        <PaperActions>
          <BrowserNotificationButton
            pressed={enabled}
            onClick={handleModalOpen}
            tooltipOpened={tooltipOpened}
            onTooltipClose={handleTooltipClose}
          />
          <ToggleIconButton
            disabled={true}
            variant="settings"
            onClick={handleMenuOpen}
            pressed={menuOpened}
          />
        </PaperActions>
      </PaperHeader>
      <PaperContent>
        {!connected && <ConnectWalletPaperSection />}
        {connected && !gateway && (
          <ProgressStatus reason={"Preparing gateway..."} />
        )}
        {connected && gateway !== null && (
          <MintDepositToStatus
            gateway={gateway}
            minimumAmount={minimumAmount}
          />
        )}
      </PaperContent>
      <Debug it={{ connected, gatewayParams, fees }} />
      <Debug it={{ gateway, provider }} />
    </>
  );
};

export type MintDepositToProps = {
  gateway: Gateway;
  minimumAmount: number | string;
};

export const MintDepositToStatus: FunctionComponent<MintDepositToProps> = ({
  gateway,
  minimumAmount,
}) => {
  const { t } = useTranslation();
  const { account } = useCurrentChainWallet();
  const [showQr, setShowQr] = useState(false);
  const toggleQr = useCallback(() => {
    setShowQr(!showQr);
  }, [showQr]);
  const { showNotification, closeNotification } = useNotifications();
  const [timeRemained] = useState(0); //useState(getRemainingGatewayTime(gateway.expiryTime));

  const toChainConfig = getChainConfig(gateway.toChain.chain as Chain);
  useEffect(() => {
    let key = 0;
    if (timeRemained > 0) {
      key = showNotification(
        <GatewayAddressValidityMessage
          milliseconds={timeRemained}
          destNetwork={toChainConfig.fullName}
        />,
        {
          variant: getHours(timeRemained) < 6 ? "error" : "warning",
          persist: true,
        }
      ) as number;
    }
    return () => {
      if (key) {
        closeNotification(key);
      }
    };
  }, [showNotification, toChainConfig, closeNotification, timeRemained]);

  const lockCurrencyConfig = getAssetConfig(Asset.BTC);
  const lockChainConfig = getChainConfig(gateway.fromChain.chain as Chain);
  // const { color } = lockCurrencyConfig;
  const color = orangeLight;
  const { Icon } = lockChainConfig;
  useSetPaperTitle(t("mint.gateway-address-title"));

  return (
    <>
      <ProgressWrapper>
        <ProgressWithContent color={color || orangeLight} size={64}>
          <Icon fontSize="inherit" color="inherit" />
        </ProgressWithContent>
      </ProgressWrapper>
      <MediumWrapper>
        <BigAssetAmount
          value={
            <span>
              {t("mint.gateway-send-to-message", {
                currency: lockCurrencyConfig.shortName,
              })}
            </span>
          }
        />
        {Boolean(minimumAmount) ? (
          <Typography
            component="p"
            variant="caption"
            align="center"
            color="textSecondary"
          >
            {t("mint.gateway-minimum-amount-label")}:{" "}
            <NumberFormatText
              value={minimumAmount}
              spacedSuffix={lockCurrencyConfig.shortName}
            />
          </Typography>
        ) : (
          <Box display="flex" justifyContent="center">
            <Skeleton variant="text" width={200} height={20} />
          </Box>
        )}
      </MediumWrapper>
      {Boolean(gateway.gatewayAddress) ? (
        <>
          {showQr && (
            <CenteringSpacedBox>
              <Grow in={showQr}>
                <BigQrCode>
                  <QRCode
                    value={getPaymentLink(
                      gateway.fromChain.chain as Chain,
                      gateway.gatewayAddress || ""
                    )}
                  />
                </BigQrCode>
              </Grow>
            </CenteringSpacedBox>
          )}
          <CopyContentButton
            content={gateway.gatewayAddress || ""}
            copiedMessage={t("common.copied-ex-message")}
          />
        </>
      ) : (
        <Skeleton variant="rect" height={45} />
      )}
      <Box
        mt={2}
        display="flex"
        justifyContent="center"
        flexDirection="column"
        alignItems="center"
      >
        <Typography variant="caption">
          {timeRemained > 0 && (
            <span>
              {t("mint.gateway-do-not-send-after-label")}:{" "}
              <strong>
                <HMSCountdown milliseconds={timeRemained} />
              </strong>
            </span>
          )}
          {timeRemained <= 0 && <span>{t("mint.expired-label")}</span>}
        </Typography>
        <Box mt={2}>
          <QrCodeIconButton onClick={toggleQr} />
        </Box>
        <BigTopWrapper>
          <TransactionDetailsButton
            label={t("mint.recipient-address-label")}
            isTx={false}
            address={trimAddress(account, 5)}
            link={gateway.toChain.addressExplorerLink(account)}
            size="small"
          />
        </BigTopWrapper>
      </Box>
    </>
  );
};
