import { Tab, Tabs } from "@material-ui/core";
import React, { FunctionComponent, useCallback } from "react";
import { RouteComponentProps } from "react-router";
import { MainLayout } from "../components/layout/MainLayout";
import { BridgePaper } from "../components/layout/Paper";
import { FlowKind } from "../components/utils/types";
import { storageKeys } from "../constants/constants";
import { useFetchFees } from "../features/fees/feesHooks";
import { MintFlow } from "./main/MintFlow";
import { ReleaseFlow } from "./main/ReleaseFlow";
import { paths } from "./routes";
import { MarketRatesData } from "./shared/MarketRatesData";

enum TabPhase {
  MINT = FlowKind.MINT,
  RELEASE = FlowKind.RELEASE,
}

export const MainPage: FunctionComponent<RouteComponentProps> = ({
  history,
}) => {
  if (!localStorage.getItem(storageKeys.TERMS_AGREED)) {
    history.replace(paths.WELCOME);
  }
  useFetchFees();
  const [tab, setTab] = React.useState(TabPhase.MINT);
  const handleTabChange = useCallback((event, newValue) => {
    //TODO: check if flow is in progress. Inform with useConfirm()
    setTab(newValue);
  }, []);

  return (
    <>
      <MarketRatesData />
      <MainLayout>
        <BridgePaper>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            indicatorColor="primary"
            variant="fullWidth"
          >
            <Tab
              label={tab === TabPhase.MINT ? "Minting" : "Mint"}
              value={TabPhase.MINT}
            />
            <Tab
              label={tab === TabPhase.RELEASE ? "Releasing" : "Release"}
              value={TabPhase.RELEASE}
            />
          </Tabs>
          {tab === TabPhase.MINT && <MintFlow />}
          {tab === TabPhase.RELEASE && <ReleaseFlow />}
        </BridgePaper>
      </MainLayout>
    </>
  );
};
