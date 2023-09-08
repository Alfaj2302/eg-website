import React from "react";
import Form from "@rjsf/core";
import schema1 from "./schema.js";
import { Alert, Box, HStack } from "native-base";
import {
  facilitatorRegistryService,
  geolocationRegistryService,
  Layout,
  BodyMedium,
  filterObject,
  FrontEndTypo,
  enumRegistryService,
  getOptions,
  validation,
  sendAndVerifyOtp,
} from "@shiksha/common-lib";
import moment from "moment";
import { useNavigate, useParams } from "react-router-dom";
import {
  templates,
  widgets,
  validator,
  transformErrors,
  onError,
} from "component/BaseInput";
import { useTranslation } from "react-i18next";
// import PhotoUpload from "";

// App
export default function App({ userTokenInfo, footerLinks }) {
  const { step } = useParams();
  const [page, setPage] = React.useState();
  const [pages, setPages] = React.useState();
  const [schema, setSchema] = React.useState({});
  const [cameraFile, setCameraFile] = React.useState();
  const formRef = React.useRef();
  const [formData, setFormData] = React.useState();
  const [facilitator, setFacilitator] = React.useState();
  const [errors, setErrors] = React.useState({});
  const [alert, setAlert] = React.useState();
  const [yearsRange, setYearsRange] = React.useState([1980, 2030]);
  const [lang, setLang] = React.useState(localStorage.getItem("lang"));
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [qualifications, setQualifications] = React.useState([]);
  const [enumObj, setEnumObj] = React.useState();
  const [verifyOtpData, setverifyOtpData] = React.useState();
  const [otpButton, setOtpButton] = React.useState(false);
  const [mobileConditon, setMobileConditon] = React.useState(false);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
      setAlert(t("GEO_GEOLOCATION_IS_NOT_SUPPORTED_BY_THIS_BROWSER"));
    }
  };

  const showPosition = async (position) => {
    let lati = position.coords.latitude;
    let longi = position.coords.longitude;

    setFormData({
      ...formData,
      lat: lati.toString(),
      long: longi.toString(),
    });
  };

  function showError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setAlert(t("GEO_USER_DENIED_THE_REQUEST_FOR_GEOLOCATION"));

        break;
      case error.POSITION_UNAVAILABLE:
        setAlert(t("GEO_LOCATION_INFORMATION_IS_UNAVAILABLE"));

        break;
      case error.TIMEOUT:
        setAlert(t("GEO_THE_REQUEST_TO_GET_USER_LOCATION_TIMED_OUT"));

        break;
      case error.UNKNOWN_ERROR:
        setAlert(t("GEO_AN_UNKNOWN_ERROR_OCCURRED"));

        break;
    }
  }

  React.useEffect(async () => {
    getLocation();
    // const qData = await benificiaryRegistoryService.getOne(id);
    // const finalData = qData.result;
    // setFormData(qData.result);
    // setFormData({
    //   ...formData,
    //   lat: finalData?.lat,
    //   long: finalData?.long,
    //   address: finalData?.address == "null" ? "" : finalData?.address,
    //   state: finalData?.state,
    //   district: finalData?.district,
    //   block: finalData?.block,
    //   village: finalData?.village,
    //   grampanchayat:
    //     finalData?.grampanchayat == "null" ? "" : finalData?.grampanchayat,
    // });
  }, []);

  const onPressBackButton = async () => {
    const data = await nextPreviewStep("p");
    if (data && onClick) {
      onClick("SplashScreen");
    }
  };

  console.log("formData", formData);

  const uiSchema = {
    dob: {
      "ui:widget": "alt-date",
      "ui:options": {
        yearsRange: yearsRange,
        hideNowButton: true,
        hideClearButton: true,
      },
    },
    qualification_ids: {
      "ui:widget": "checkboxes",
    },
  };

  const nextPreviewStep = async (pageStape = "n") => {
    setAlert();
    const index = pages.indexOf(page);
    if (index !== undefined) {
      let nextIndex = "";
      if (pageStape.toLowerCase() === "n") {
        nextIndex = pages[index + 1];
      } else {
        nextIndex = pages[index - 1];
      }
      if (pageStape === "p") {
        if (nextIndex === "qualification_details") {
          navigate("/profile");
        } else {
          navigate("/CampDashboard/CampRegistration");
        }
      } else if (nextIndex === "qualification_details") {
        navigate(`/profile/edit/array-form/vo_experience`);
      } else if (nextIndex === "aadhaar_details") {
        navigate(`/profile/edit/upload`);
      } else if (nextIndex !== undefined) {
        navigate(`/CampDashboard/CampRegistration/edit/${nextIndex}`);
      } else {
        navigate(`/aadhaar-kyc/${facilitator?.id}`, {
          state: "/profile",
        });
      }
    }
  };

  React.useEffect(async () => {
    const qData = await facilitatorRegistryService.getQualificationAll();
    setQualifications(qData);
  }, []);

  // update schema
  React.useEffect(async () => {
    let newSchema = schema;
    if (schema?.properties) {
      setLoading(true);
      if (schema?.["properties"]?.["property_type"]) {
        newSchema = getOptions(newSchema, {
          key: "property_type",
          arr: qualifications,
          title: "name",
          value: "id",
          filters: { type: "qualification" },
        });
        if (newSchema?.properties?.qualification_master_id) {
          let valueIndex = "";
          newSchema?.properties?.qualification_master_id?.enumNames?.forEach(
            (e, index) => {
              if (e.match("12")) {
                valueIndex =
                  newSchema?.properties?.qualification_master_id?.enum[index];
              }
            }
          );
          if (
            valueIndex !== "" &&
            formData?.qualification_master_id == valueIndex
          ) {
            setAlert(t("YOU_NOT_ELIGIBLE"));
          } else {
            setAlert();
          }
        }
      }
      if (schema?.["properties"]?.["qualification_reference_document_id"]) {
        const { id } = userTokenInfo?.authUser;
        newSchema = getOptions(newSchema, {
          key: "qualification_reference_document_id",
          extra: {
            userId: id,
            document_type: formData?.type_of_document,
          },
        });
      }

      if (schema?.["properties"]?.["qualification_ids"]) {
        newSchema = getOptions(newSchema, {
          key: "qualification_ids",
          arr: qualifications,
          title: "name",
          value: "id",
          filters: { type: "teaching" },
        });
      }
    }

    if (schema?.properties?.state) {
      const qData = await geolocationRegistryService.getStates();
      if (schema?.["properties"]?.["state"]) {
        newSchema = getOptions(newSchema, {
          key: "state",
          arr: qData?.states,
          title: "state_name",
          value: "state_name",
        });
      }
      newSchema = await setDistric({
        schemaData: newSchema,
        state: formData?.state,
        district: formData?.district,
        block: formData?.block,
      });
    }
    if (schema?.properties?.device_ownership) {
      if (formData?.device_ownership == "no") {
        setAlert(t("YOU_NOT_ELIGIBLE"));
      } else {
        setAlert();
      }
    }
    if (schema?.properties?.designation) {
      newSchema = getOptions(newSchema, {
        key: "designation",
        arr: enumObj?.FACILITATOR_REFERENCE_DESIGNATION,
        title: "title",
        value: "value",
      });
    }
    if (schema?.["properties"]?.["marital_status"]) {
      newSchema = getOptions(newSchema, {
        key: "social_category",
        arr: enumObj?.FACILITATOR_SOCIAL_STATUS,
        title: "title",
        value: "value",
      });

      newSchema = getOptions(newSchema, {
        key: "marital_status",
        arr: enumObj?.MARITAL_STATUS,
        title: "title",
        value: "value",
      });
    }

    if (schema?.["properties"]?.["device_type"]) {
      newSchema = getOptions(newSchema, {
        key: "device_type",
        arr: enumObj?.MOBILE_TYPE,
        title: "title",
        value: "value",
      });
    }

    if (schema?.["properties"]?.["document_id"]) {
      const { id } = userTokenInfo?.authUser;
      newSchema = getOptions(newSchema, {
        key: "document_id",
        extra: { userId: id },
      });
    }
    setLoading(false);
    setSchema(newSchema);
  }, [page, formData, qualifications]);

  React.useEffect(() => {
    if (schema1.type === "step") {
      const properties = schema1.properties;
      const newSteps = Object.keys(properties);
      const newStep = step ? step : newSteps[0];
      setPage(newStep);
      setSchema(properties[newStep]);
      setPages(newSteps);
      console.log("pageee", {
        newSteps,
        newStep,
        schema: properties[newStep],
      });
    }
  }, [step]);

  const formSubmitUpdate = async (data, overide) => {
    const { id } = userTokenInfo?.authUser;
    if (id) {
      setLoading(true);
      const result = await facilitatorRegistryService.profileStapeUpdate({
        ...data,
        page_type: step,
        ...(overide ? overide : {}),
        id: id,
      });
      setLoading(false);
      return result;
    }
  };

  const customValidate = (data, errors, c, asd) => {
    if (step === "property_details") {
      if (data?.OWNER_OF_THE_PROPERTY?.mobile) {
        validation({
          data: data?.OWNER_OF_THE_PROPERTY?.mobile,
          key: "mobile",
          errors,
          message: `${t("PLEASE_ENTER_VALID_10_DIGIT_NUMBER")}`,
          type: "mobile",
        });
      }
    }

    if (step === "basic_details") {
      ["first_name", "middle_name", "last_name"].forEach((key) => {
        validation({
          data:
            typeof data?.[key] === "string"
              ? data?.[key].replaceAll(" ", "")
              : data?.[key],
          key,
          errors,
          message: `${t("REQUIRED_MESSAGE")} ${t(
            schema?.properties?.[key]?.title
          )}`,
        });
        if (data?.[key] && !data?.[key]?.match(/^[a-zA-Z ]*$/g)) {
          errors?.[key]?.addError(
            `${t("REQUIRED_MESSAGE")} ${t(schema?.properties?.[key]?.title)}`
          );
        }
      });
    }

    return errors;
  };

  const setDistric = async ({ state, district, block, schemaData }) => {
    let newSchema = schemaData;
    setLoading(true);
    if (schema?.properties?.district && state) {
      const qData = await geolocationRegistryService.getDistricts({
        name: state,
      });
      if (schema?.["properties"]?.["district"]) {
        newSchema = getOptions(newSchema, {
          key: "district",
          arr: qData?.districts,
          title: "district_name",
          value: "district_name",
        });
      }
      if (schema?.["properties"]?.["block"]) {
        newSchema = await setBlock({ district, block, schemaData: newSchema });
        setSchema(newSchema);
      }
    } else {
      newSchema = getOptions(newSchema, { key: "district", arr: [] });
      if (schema?.["properties"]?.["block"]) {
        newSchema = getOptions(newSchema, { key: "block", arr: [] });
      }
      if (schema?.["properties"]?.["village"]) {
        newSchema = getOptions(newSchema, { key: "village", arr: [] });
      }
      setSchema(newSchema);
    }
    setLoading(false);
    return newSchema;
  };

  const setBlock = async ({ district, block, schemaData }) => {
    let newSchema = schemaData;
    setLoading(true);
    if (schema?.properties?.block && district) {
      const qData = await geolocationRegistryService.getBlocks({
        name: district,
      });
      if (schema?.["properties"]?.["block"]) {
        newSchema = getOptions(newSchema, {
          key: "block",
          arr: qData?.blocks,
          title: "block_name",
          value: "block_name",
        });
      }
      if (schema?.["properties"]?.["village"]) {
        newSchema = await setVilage({ block, schemaData: newSchema });
        setSchema(newSchema);
      }
    } else {
      newSchema = getOptions(newSchema, { key: "block", arr: [] });
      if (schema?.["properties"]?.["village"]) {
        newSchema = getOptions(newSchema, { key: "village", arr: [] });
      }
      setSchema(newSchema);
    }
    setLoading(false);
    return newSchema;
  };

  const setVilage = async ({ block, schemaData }) => {
    let newSchema = schemaData;
    setLoading(true);
    if (schema?.properties?.village && block) {
      const qData = await geolocationRegistryService.getVillages({
        name: block,
      });
      if (schema?.["properties"]?.["village"]) {
        newSchema = getOptions(newSchema, {
          key: "village",
          arr: qData?.villages,
          title: "village_ward_name",
          value: "village_ward_name",
        });
      }
      setSchema(newSchema);
    } else {
      newSchema = getOptions(newSchema, { key: "village", arr: [] });
      setSchema(newSchema);
    }
    setLoading(false);
    return newSchema;
  };
  const onChange = async (e, id) => {
    const data = e.formData;
    setErrors();
    const newData = { ...formData, ...data };
    setFormData(newData);
    if (id === "root_mobile") {
      if (
        data?.mobile?.toString()?.length === 10 &&
        facilitator?.mobile !== data?.mobile
      ) {
        const result = await userExist({ mobile: data?.mobile });
        if (result.isUserExist) {
          const newErrors = {
            mobile: {
              __errors: [t("MOBILE_NUMBER_ALREADY_EXISTS")],
            },
          };
          setErrors(newErrors);
          setMobileConditon(false);
        } else {
          setMobileConditon(true);
        }
        if (schema?.properties?.otp) {
          const { otp, ...properties } = schema?.properties;
          const required = schema?.required.filter((item) => item !== "otp");
          setSchema({ ...schema, properties, required });
          setFormData((e) => {
            const { otp, ...fData } = e;
            return fData;
          });
          setOtpButton(false);
        }
      }
    }
    setFormData(newData);
    if (id === "root_contact_number") {
      if (data?.contact_number?.toString()?.length < 10) {
        const newErrors = {
          contact_number: {
            __errors: [t("PLEASE_ENTER_VALID_10_DIGIT_NUMBER")],
          },
        };
        setErrors(newErrors);
      }
      if (userTokenInfo?.authUser?.mobile === data?.contact_number) {
        const newErrors = {
          contact_number: {
            __errors: [t("REFERENCE_NUMBER_SHOULD_NOT_BE_SAME")],
          },
        };
        setErrors(newErrors);
      }
    }
    if (id === "root_name") {
      if (!data?.name?.length) {
        const newErrors = {
          name: {
            __errors: [t("NAME_CANNOT_BE_EMPTY")],
          },
        };
        setErrors(newErrors);
      }
    }

    if (id === "root_state") {
      await setDistric({
        schemaData: schema,
        state: data?.state,
        district: data?.district,
        block: data?.block,
      });
    }

    if (id === "root_district") {
      await setBlock({
        district: data?.district,
        block: data?.block,
        schemaData: schema,
      });
    }

    if (id === "root_block") {
      await setVilage({ block: data?.block, schemaData: schema });
    }
  };

  const onSubmit = async (data) => {
    let newFormData = data.formData;

    if (_.isEmpty(errors)) {
      let newdata = filterObject(
        newFormData,
        Object.keys(schema?.properties),
        {},
        ""
      );
      if (step === "property_details") {
        newdata = {
          ...newdata,
          OWNER_OF_THE_PROPERTY: filterObject(
            newFormData?.OWNER_OF_THE_PROPERTY,
            Object.keys(schema?.properties?.OWNER_OF_THE_PROPERTY?.properties),
            {},
            ""
          ),
        };
      }
      console.log("newdata", newdata);
      const data = await formSubmitUpdate(newdata);
      // }
      if (localStorage.getItem("backToProfile") === "false") {
        nextPreviewStep();
      } else {
        navigate("/profile");
      }
    }
  };

  // if (page === "upload") {
  //   return (
  //     <PhotoUpload
  //       {...{
  //         formData,
  //         cameraFile,
  //         setCameraFile,
  //         aadhar_no: facilitator?.aadhar_no,
  //       }}
  //     />
  //   );
  // }

  const onClickSubmit = (backToProfile) => {
    if (formRef.current.validateForm()) {
      formRef?.current?.submit();
    }
    localStorage.setItem("backToProfile", backToProfile);
  };

  return (
    <Layout
      _appBar={{
        onPressBackButton,
        onlyIconsShow: ["backBtn"],
        leftIcon: <FrontEndTypo.H2>{t(schema?.step_name)}</FrontEndTypo.H2>,
        lang,
        setLang,
        _box: { bg: "white", shadow: "appBarShadow" },
        _backBtn: { borderWidth: 1, p: 0, borderColor: "btnGray.100" },
      }}
      _page={{ _scollView: { bg: "formBg.500" } }}
      _footer={{ menues: footerLinks }}
    >
      <Box py={6} px={4} mb={5}>
        {alert ? (
          <Alert status="warning" alignItems={"start"} mb="3">
            <HStack alignItems="center" space="2" color>
              <Alert.Icon />
              <BodyMedium>{alert}</BodyMedium>
            </HStack>
          </Alert>
        ) : (
          <React.Fragment />
        )}
        {page && page !== "" && (
          <Form
            key={lang}
            ref={formRef}
            extraErrors={errors}
            showErrorList={false}
            noHtml5Validate={true}
            {...{
              widgets,
              templates,
              validator,
              schema: schema ? schema : {},
              uiSchema,
              formData,
              customValidate,
              onChange,
              onSubmit,
              onError,
              transformErrors: (errors) => transformErrors(errors, schema, t),
            }}
          >
            {mobileConditon && step === "contact_details" ? (
              <FrontEndTypo.Primarybutton
                mt="3"
                variant={"primary"}
                type="submit"
                onPress={otpfunction}
              >
                {otpButton ? t("VERIFY_OTP") : t("SEND_OTP")}
              </FrontEndTypo.Primarybutton>
            ) : (
              <Box>
                <FrontEndTypo.Primarybutton
                  isLoading={loading}
                  p="4"
                  mt="4"
                  onPress={() => onClickSubmit(false)}
                >
                  {t("SAVE_AND_NEXT")}
                </FrontEndTypo.Primarybutton>
              </Box>
            )}
          </Form>
        )}
      </Box>
    </Layout>
  );
}
