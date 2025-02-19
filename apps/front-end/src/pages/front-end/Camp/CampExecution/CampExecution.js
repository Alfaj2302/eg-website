import {
  campService,
  FrontEndTypo,
  Layout,
  Alert as TAlert,
  Loading,
  Camera,
  uploadRegistryService,
  ImageView,
  useLocationData,
  CardComponent,
  enumRegistryService,
} from "@shiksha/common-lib";
import Chip from "component/Chip";
import moment from "moment";
import {
  Box,
  HStack,
  VStack,
  Alert,
  Image,
  Stack,
  Pressable,
  Spinner,
  Progress,
} from "native-base";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import CampExecutionEnd from "./CampExecutionEnd";
import CampAttendance from "./CampAttendance";
import CampTodayActivities from "./CampTodayActivities";

export default function CampExecution({ footerLinks, setAlert }) {
  const { t } = useTranslation();
  const { id, step } = useParams();
  const [error, setError] = React.useState();
  const [data, setData] = React.useState({});
  const [facilitator, setFacilitator] = React.useState();
  const [start, setStart] = React.useState(false);
  const [cameraFile, setCameraFile] = React.useState();
  const [cameraUrl, setCameraUrl] = React.useState();
  const [activityId, setActivityId] = React.useState();
  const [todaysActivity, setTodaysActivity] = React.useState();
  const navigate = useNavigate();
  const [latData, longData] = useLocationData() || [];
  const [loading, setLoading] = React.useState(true);
  const [learnerCount, setLearnerCount] = React.useState();
  const [moodList, setMoodList] = React.useState();
  const [activeChip, setActiveChip] = React.useState(null);
  const [page, setPage] = React.useState("");
  const [progress, setProgress] = React.useState(0);

  const campDetails = React.useCallback(async () => {
    if (!["attendance"].includes(step)) {
      const result = await campService.getCampDetails({ id });
      setFacilitator(result?.data?.faciltator?.[0] || {});
      setLearnerCount(result?.data?.group_users?.length);
    }
    const obj = {
      id: id,
      start_date: moment(new Date()).format("YYYY-MM-DD"),
    };
    const data = await campService.getActivity(obj);
    const activity = data?.data?.camp_days_activities_tracker;
    setTodaysActivity(activity?.[0] || {});
    setActivityId(activity?.[0]?.id);
    setLoading(false);
  }, [navigate, setTodaysActivity]);

  React.useEffect(() => {
    campDetails();
  }, [campDetails]);

  const enumData = React.useCallback(async () => {
    if (cameraFile && cameraUrl?.url) {
      const listOfEnum = await enumRegistryService.listOfEnum();
      const newMoodList = listOfEnum?.data?.FACILITATOR_MOOD_LIST;
      const images = [
        "/smiley_1.png",
        "/smiley_2.png",
        "/smiley_3.png",
        "/smiley_4.png",
        "/smiley_5.png",
        "/smiley_6.png",
      ];
      const moodListWithImages = newMoodList?.map((mood, index) => ({
        ...mood,
        img: images[index % images?.length],
      }));
      setMoodList(moodListWithImages);
    }
  }, [cameraFile, cameraUrl]);

  React.useEffect(async () => {
    enumData();
  }, [enumData]);

  const handleChipClick = React.useCallback(
    (item) => {
      setActiveChip(item);
    },
    [setActiveChip]
  );

  React.useEffect(() => {
    setData({ ...data, lat: `${latData}`, long: `${longData}` });
  }, [latData]);

  const startCamp = React.useCallback(async () => {
    setLoading(true);
    if (activeChip && cameraFile) {
      const payLoad = {
        camp_id: id,
        camp_day_happening: "yes",
        mood: activeChip,
        ...data,
        photo_1: `${cameraFile}`,
      };
      const result = await campService.campActivity(payLoad);
      const activitiesData = result?.insert_camp_days_activities_tracker_one;
      setActivityId(activitiesData?.id);
      setTodaysActivity(activitiesData);
      setCameraFile();
      setCameraUrl();
    } else {
      setError("SELECT_MESSAGE");
    }
    setLoading(false);
  }, [activeChip, id, setLoading, setTodaysActivity]);

  // start Camp
  const closeCamera = React.useCallback(() => {
    try {
      setStart(false);
    } catch (e) {}
  }, [setStart]);

  const campBegin = React.useCallback(() => {
    setStart(true);
  }, [setStart]);

  // uploadAttendencePicture from start camp
  // const uploadAttendencePicture = async (activitiesId) => {
  //   if (cameraFile) {
  //     const dataQ = {
  //       ...data,
  //       context_id: activitiesId,
  //       user_id: facilitator?.id,
  //       status: "present",
  //       reason: "camp_started",
  //       photo_1: `${cameraFile}`,
  //     };
  //     await campService.markCampAttendance(dataQ);
  //     setCameraFile();
  //   } else {
  //     setError("Capture Picture First");
  //   }
  //   setCameraUrl();
  // };

  const getAccess = React.useCallback(async () => {
    if (
      todaysActivity?.camp_day_happening === "no" ||
      todaysActivity?.end_date !== null ||
      !todaysActivity.id
    ) {
    } else if (["attendance", "activities"].includes(step)) {
      setPage(step);
    } else if (todaysActivity?.end_date === null) {
      setPage("endcamp");
    }
  }, [step, todaysActivity, setPage]);

  React.useEffect(() => {
    getAccess();
  }, [getAccess]);

  const airplaneImageUri = React.useMemo(() => "/airoplane.gif", []);

  if (start && data?.lat && data?.long && !loading) {
    return (
      <React.Suspense fallback={<Loading />}>
        <Camera
          messageComponent={
            <VStack>
              <FrontEndTypo.H3 color="white" textAlign="center">
                {t("ATTENDANCE_PHOTO_MSG")}
              </FrontEndTypo.H3>
            </VStack>
          }
          loading={
            progress && (
              <VStack space={4} justifyContent="center" p="4">
                <Spinner
                  color={"primary.500"}
                  accessibilityLabel="Loading posts"
                  size="lg"
                />
                <Progress value={progress} colorScheme="red" />
                <FrontEndTypo.H3 textAlign="center" color="white">
                  {progress}%
                </FrontEndTypo.H3>
              </VStack>
            )
          }
          {...{
            onFinish: (e) => closeCamera(),
            cameraModal: start,
            setCameraModal: (e) => {
              setCameraUrl();
              setStart(e);
            },
            cameraUrl,
            filePreFix: `camp_prerak_attendace_user_id_${facilitator?.id}_`,
            setCameraUrl: async (url, file) => {
              setProgress(0);
              if (file) {
                setError("");
                let formData = new FormData();
                formData.append("user_id", facilitator?.id);
                formData.append("document_type", "camp_attendance");
                formData.append("file", file);
                const uploadDoc = await uploadRegistryService.uploadFile(
                  formData,
                  {},
                  (progressEvent) => {
                    const { loaded, total } = progressEvent;
                    let percent = Math.floor((loaded * 100) / total);
                    setProgress(percent);
                  }
                );
                if (uploadDoc?.data?.insert_documents?.returning?.[0]?.name) {
                  setCameraFile(
                    uploadDoc?.data?.insert_documents?.returning?.[0]?.name
                  );
                }
                setCameraUrl({ url, file });
              } else {
                setCameraUrl();
              }
            },
            cameraSide: true,
          }}
        />
      </React.Suspense>
    );
  }

  if (cameraFile) {
    return (
      <React.Suspense fallback={<Loading />}>
        <Layout
          _appBar={{ name: t("CAMP_EXECUTION") }}
          loading={loading}
          _footer={{ menues: footerLinks }}
        >
          <VStack py={6} px={4} mb={5} space="6">
            <FrontEndTypo.H2 color={"textMaroonColor.400"}>
              {t("LEARNER_ENVIRONMENT")}
            </FrontEndTypo.H2>
            <HStack justifyContent={"center"} flexWrap={"wrap"}>
              <ImageView
                urlObject={{ fileUrl: cameraUrl?.url }}
                alt={`Alternate`}
                width={"190px"}
                height={"190px"}
                borderRadius="0"
                _image={{ borderRadius: 0 }}
              />
            </HStack>
            <HStack justifyContent={"center"} flexWrap={"wrap"}>
              {moodList?.map((item) => {
                return (
                  <VStack
                    space={4}
                    my={2}
                    mx={3}
                    alignItems={"center"}
                    key={item}
                    width={"40%"}
                  >
                    <Pressable onPress={() => handleChipClick(item?.value)}>
                      <Image
                        w={"150"}
                        h={"150"}
                        borderRadius="0"
                        source={{
                          uri: `${item?.img}`,
                        }}
                        alt="airoplane.gif"
                      />
                      <Chip width="150px" isActive={activeChip === item?.value}>
                        <FrontEndTypo.H4
                          color={activeChip === item?.value ? "white" : "black"}
                          textAlign={"center"}
                          fontSize={"12px"}
                        >
                          {t(item?.title)}
                        </FrontEndTypo.H4>
                      </Chip>
                    </Pressable>
                  </VStack>
                );
              })}
            </HStack>
            {error && (
              <Alert status="warning">
                <HStack space={2}>
                  <Alert.Icon />
                  <FrontEndTypo.H3>{t("SELECT_MESSAGE")}</FrontEndTypo.H3>
                </HStack>
              </Alert>
            )}
            <FrontEndTypo.Secondarybutton
              onPress={(e) => {
                setCameraFile();
                setCameraUrl();
                setStart(true);
                setProgress(0);
              }}
            >
              {t("TAKE_ANOTHER_PHOTO")}
            </FrontEndTypo.Secondarybutton>
            <FrontEndTypo.Primarybutton onPress={startCamp}>
              {t("START_CAMP")}
            </FrontEndTypo.Primarybutton>
          </VStack>
        </Layout>
      </React.Suspense>
    );
  } else if (page === "endcamp") {
    return (
      <React.Suspense fallback={<Loading />}>
        <CampExecutionEnd {...{ learnerCount, todaysActivity, facilitator }} />
      </React.Suspense>
    );
  } else if (page === "attendance") {
    return (
      <React.Suspense fallback={<Loading />}>
        <CampAttendance activityId={activityId} />
      </React.Suspense>
    );
  } else if (page === "activities") {
    return (
      <React.Suspense fallback={<Loading />}>
        <CampTodayActivities
          footerLinks={footerLinks}
          setAlert={setAlert}
          activityId={activityId}
        />
      </React.Suspense>
    );
  }

  return (
    <Layout
      _appBar={{ name: t("CAMP_EXECUTION") }}
      loading={loading}
      _footer={{ menues: footerLinks }}
    >
      {!todaysActivity?.id ? (
        <VStack space="5" p="5">
          <Box alignContent="center">
            <HStack justifyContent={"space-between"}>
              <FrontEndTypo.H1 color="textMaroonColor.400" pl="1">
                {t("WELCOME")}{" "}
                {[
                  facilitator?.first_name,
                  facilitator?.middle_name,
                  facilitator?.last_name,
                ]
                  .filter((e) => e)
                  .join(" ")}
                ,
              </FrontEndTypo.H1>
            </HStack>
          </Box>
          <Box
            margin={"auto"}
            height={"200px"}
            width={"340px"}
            borderColor={"black"}
            bg={"red.100"}
            position="relative"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Image
              source={{
                uri: airplaneImageUri,
              }}
              alt="airoplane.gif"
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              zIndex={-1}
            />

            <VStack alignItems="center" justifyContent="center">
              <ImageView
                width="80px"
                height="80px"
                source={{ document_id: facilitator?.profile_photo_1?.id }}
              />
              <CardComponent
                _header={{ bg: "light.100" }}
                _vstack={{
                  bg: "light.100",
                  flex: 1,
                  pt: 2,
                  m: 4,
                  mb: 4,
                }}
              >
                {t("YOUR_WELCOME_READY_TO_FLY")}
              </CardComponent>
            </VStack>
          </Box>
          <VStack alignItems="center" space="5">
            <FrontEndTypo.H1 color="textMaroonColor.400" pl="1">
              {t("STARTS_YOUR_DAY")}
            </FrontEndTypo.H1>
          </VStack>
          <VStack space="4">
            <TAlert
              alert={error}
              setAlert={(e) => {
                setStart(false);
                setError(e);
              }}
              _alert={{
                status: "warning",
              }}
              type="warning"
            />
            <VStack space="4">
              <Stack space={4}>
                <FrontEndTypo.H3>
                  {t("WILL_THE_CAMP_BE_CONDUCTED_TODAY")}
                </FrontEndTypo.H3>
                <FrontEndTypo.Primarybutton onPress={campBegin}>
                  {t("YES_ABSOLUTELY")}
                </FrontEndTypo.Primarybutton>
                <FrontEndTypo.Secondarybutton
                  onPress={(e) => navigate(`/camps/${id}/campotherplans`)}
                >
                  {t("NO_PLAN")}
                </FrontEndTypo.Secondarybutton>
              </Stack>
            </VStack>
          </VStack>
        </VStack>
      ) : (
        <Stack space="3" p="5">
          <Alert status="warning" alignItems={"center"}>
            <HStack alignItems="center" space="2">
              <Alert.Icon />
              <FrontEndTypo.H3>
                {t(
                  todaysActivity?.camp_day_happening === "no"
                    ? "CAMP_LEAVE"
                    : "TODAYS_CAMP_HAS_BEEN_COMPLETED"
                )}
              </FrontEndTypo.H3>
            </HStack>
          </Alert>
          <FrontEndTypo.Primarybutton onPress={(e) => navigate(`/camps`)}>
            {t("GO_TO_PROFILE")}
          </FrontEndTypo.Primarybutton>
        </Stack>
      )}
    </Layout>
  );
}
