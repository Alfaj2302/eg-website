import {
  FrontEndTypo,
  IconByName,
  Layout,
  campService,
  Loading,
  enumRegistryService,
} from "@shiksha/common-lib";
import moment from "moment";
import { HStack, Modal, ScrollView, VStack } from "native-base";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import SessionActions, { SessionList } from "./CampSessionModal";

const checkNext = (status, updated_at) => {
  return (
    status === "complete" &&
    updated_at &&
    moment.utc(updated_at).format("YYYY-MM-DD") ===
      moment.utc().format("YYYY-MM-DD")
  );
};

export default function CampSessionList({ footerLinks }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const [sessionList, setSessionList] = React.useState([]);
  const [sessionActive, setSessionActive] = React.useState();
  const [loading, setLoading] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState();
  const [enumOptions, setEnumOptions] = React.useState({});
  const [sessionDetails, setSessionDetails] = React.useState();
  const [previousSessionDetails, setPreviousSessionDetails] = React.useState();
  const [isDisable, setIsDisable] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState();
  const [error, setError] = React.useState();
  const navigate = useNavigate();
  const [bodyHeight, setBodyHeight] = React.useState();

  const getData = React.useCallback(async () => {
    if (modalVisible) {
      const result = await campService.getCampSessionDetails({
        id: modalVisible,
        camp_id: id,
      });
      if (result?.data?.ordering > 1) {
        const data = sessionList?.find(
          (e) => e?.ordering === result?.data?.ordering - 1
        );
        setPreviousSessionDetails(data);
      }
      setSessionDetails(result?.data);
    }
  }, [modalVisible]);

  React.useEffect(() => {
    const completeItem = sessionList.filter(
      (item) => item?.session_tracks?.[0]?.status === "complete"
    );
    const lastCompleteItem = completeItem.pop();

    setTimeout(() => {
      const targetSection = document.getElementById(lastCompleteItem?.id - 1);
      if (targetSection) {
        // Scroll to the section
        targetSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 2000);
  }, [sessionList]);

  React.useEffect(() => {
    const fetchData = async () => {
      await getData();
    };
    fetchData();
  }, [modalVisible]);

  // const handleStartSession = React.useCallback(
  //   async (modalVisible) => {
  //     setIsDisable(true);
  //     await campService.creatCampSession({
  //       learning_lesson_plan_id: modalVisible,
  //       camp_id: id,
  //     });
  //     await getData();
  //     setIsDisable(false);
  //   },
  //   [getData, submitStatus]
  // );

  const handlePartiallyDone = React.useCallback(async () => {
    setError();
    setIsDisable(true);
    if (submitStatus?.reason) {
      if (sessionDetails?.session_tracks?.[0]?.id) {
        await campService.updateCampSession({
          id: sessionDetails?.session_tracks?.[0]?.id,
          edit_session_type:
            submitStatus?.status === "complete"
              ? "edit_complete_session"
              : "edit_incomplete_session",
          session_feedback: submitStatus?.reason,
        });
      } else {
        let newData = { status: submitStatus?.status };
        if (submitStatus?.status === "incomplete") {
          newData = {
            ...newData,
            lesson_plan_incomplete_feedback: submitStatus?.reason,
          };
        } else if (submitStatus?.status === "complete") {
          newData = {
            ...newData,
            lesson_plan_complete_feedback: submitStatus?.reason,
          };
        }
        await campService.creatCampSession({
          ...newData,
          learning_lesson_plan_id: modalVisible,
          camp_id: id,
        });
      }
      await getCampSessionsList();
      setSubmitStatus();
      setModalVisible();
    } else {
      setError("PLEASE_SELECT");
    }
    setIsDisable(false);
  }, [submitStatus]);

  const handleCancel = () => {
    setError();
    setSubmitStatus();
  };

  const getSessionCount = (data) => {
    let count = 0;
    const result = data
      .filter((e) => e.session_tracks?.[0]?.id)
      .map((e) => ({ ...e.session_tracks?.[0], ordering: e?.ordering }));
    let sessionData = result?.[result?.length - 1] || { ordering: 1 };
    const c1 = result.filter((e) => {
      const format = "YYYY-MM-DD";
      return (
        e.status === "complete" &&
        moment(e.created_at).format(format) !== moment().format(format) &&
        moment(e.updated_at).format(format) === moment().format(format)
      );
    });

    const c2 = result.filter((e) => {
      const format = "YYYY-MM-DD";
      return (
        e.status === "incomplete" &&
        moment(e.created_at).format(format) === moment().format(format) &&
        moment(e.updated_at).format(format) === moment().format(format)
      );
    });

    const c3 = result.filter((e) => {
      const format = "YYYY-MM-DD";
      return (
        e.status === "complete" &&
        moment(e.created_at).format(format) === moment().format(format) &&
        moment(e.updated_at).format(format) === moment().format(format)
      );
    });

    if (c1?.length > 0) {
      count += 0.5;
      sessionData = c1[0];
    }

    if (c2?.length > 0) {
      count += 0.5;
      sessionData = c2[0];
    }

    if (c3?.length > 0) {
      count += 1;
      sessionData = c3[0];
    }

    if (sessionData?.status === "complete" && count < 1.5) {
      sessionData = data.find((e) => sessionData?.ordering + 1 === e?.ordering);
    }
    if (count >= 1.5) {
      sessionData = {};
    }

    return { ...sessionData, countSession: count };
  };

  const getCampSessionsList = async () => {
    const result = await campService.getCampSessionsList({ id: id });
    const data = result?.data?.learning_lesson_plans_master || [];
    setSessionList(data);
    setSessionActive(getSessionCount(data));
  };

  React.useEffect(async () => {
    await getCampSessionsList();
    const enumData = await enumRegistryService.listOfEnum();
    setEnumOptions(enumData?.data ? enumData?.data : {});
    setLoading(false);
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <Layout
      _appBar={{
        onlyIconsShow: ["backBtn", "langBtn"],
        leftIcon: <FrontEndTypo.H2>{t("SESSION_LIST")}</FrontEndTypo.H2>,
        _box: { bg: "white", shadow: "appBarShadow" },
      }}
      _page={{ _scollView: { bg: "bgGreyColor.200" } }}
      _footer={{ menues: footerLinks }}
      getBodyHeight={(e) => setBodyHeight(e)}
    >
      <VStack flex={1} space={"5"} p="5">
        <HStack space="2">
          <IconByName name="BookOpenLineIcon" />
          <FrontEndTypo.H2 color="textMaroonColor.400">
            {t("SESSION")}
          </FrontEndTypo.H2>
        </HStack>
        <ScrollView maxH={bodyHeight - 150} p="4">
          <SessionList {...{ sessionList, sessionActive, setModalVisible }} />
        </ScrollView>
      </VStack>
      {!sessionActive?.ordering && (
        <VStack px="4">
          <FrontEndTypo.Primarybutton
            onPress={() => {
              navigate(`/camps/${id}/campexecution/activities`);
            }}
          >
            {t("SUBMIT")}
          </FrontEndTypo.Primarybutton>
        </VStack>
      )}

      <Modal isOpen={modalVisible} avoidKeyboard size="xl">
        <Modal.Content>
          <Modal.Header>
            <FrontEndTypo.H3
              textAlign={"Center"}
              color="textMaroonColor.400"
              bold
            >
              {t("LESSON")} {sessionDetails?.ordering}
            </FrontEndTypo.H3>
            <Modal.CloseButton
              onPress={() => {
                setModalVisible();
                setSubmitStatus();
              }}
            />
          </Modal.Header>
          <Modal.Body p="6">
            <SessionActions
              {...{
                sessionActive,
                isDisable,
                enumOptions,
                submitStatus,
                setSubmitStatus,
                handlePartiallyDone,
                handleCancel,
                error,
              }}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Layout>
  );
}
