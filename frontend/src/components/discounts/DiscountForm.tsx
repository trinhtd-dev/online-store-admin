import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Spin,
  message,
} from "antd";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { debounce } from "lodash";
import discountService from "../../services/discountService";
import {
  DiscountResponse,
  CreateDiscountRequest,
  UpdateDiscountRequest,
  DiscountType,
  DiscountStatus,
  VariantOption,
} from "../../api/types";

const { Option } = Select;
const { RangePicker } = DatePicker;

interface DiscountFormProps {
  form: FormInstance; // Sử dụng FormInstance thay vì any
  initialValues?: DiscountResponse | null;
  onFinish: (values: CreateDiscountRequest | UpdateDiscountRequest) => void;
  isSubmitting: boolean;
}

const DiscountForm: React.FC<DiscountFormProps> = ({
  form,
  initialValues,
  onFinish,
  isSubmitting,
}) => {
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [searchingVariants, setSearchingVariants] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType | undefined>(
    initialValues?.type
  );

  // Populate variant options if editing
  useEffect(() => {
    if (initialValues) {
      setVariantOptions([
        {
          id: initialValues.product_variant_id,
          sku: initialValues.variant_sku,
          product_name: initialValues.product_name,
        },
      ]);
      setDiscountType(initialValues.type);
      // Convert date strings to Dayjs objects for RangePicker
      const startDate = initialValues.start_date
        ? dayjs(initialValues.start_date)
        : null;
      const endDate = initialValues.end_date
        ? dayjs(initialValues.end_date)
        : null;
      form.setFieldsValue({
        ...initialValues,
        dateRange: startDate && endDate ? [startDate, endDate] : undefined,
      });
    } else {
      form.resetFields();
      setVariantOptions([]);
      setDiscountType(undefined);
    }
  }, [initialValues, form]);

  const fetchVariants = useCallback(
    async (search: string) => {
      if (!search) {
        setVariantOptions([]);
        return;
      }
      setSearchingVariants(true);
      try {
        const data = await discountService.searchVariants(search);
        setVariantOptions(data || []);
      } catch (error) {
        message.error("Không thể tìm kiếm biến thể sản phẩm");
        setVariantOptions([]);
      } finally {
        setSearchingVariants(false);
      }
    },
    [setVariantOptions, setSearchingVariants]
  );

  // Debounce the fetch variants function
  const debouncedFetchVariants = useCallback(
    debounce(fetchVariants, 500), // 500ms debounce delay
    [fetchVariants] // Dependency array for useCallback
  );

  const handleFinish = (values: any) => {
    const { dateRange, ...restValues } = values;
    const payload = {
      ...restValues,
      start_date: dateRange?.[0]?.toISOString() || null,
      end_date: dateRange?.[1]?.toISOString() || null,
      value: parseFloat(values.value), // Ensure value is number
    };
    onFinish(payload);
  };

  const handleTypeChange = (value: DiscountType) => {
    setDiscountType(value);
    // Reset value field when type changes to avoid validation issues
    form.setFieldsValue({ value: undefined });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        status: "Active", // Default status
        ...initialValues,
        dateRange:
          initialValues?.start_date && initialValues.end_date
            ? [dayjs(initialValues.start_date), dayjs(initialValues.end_date)]
            : undefined,
      }}
    >
      <Form.Item
        name="product_variant_id"
        label="Biến thể sản phẩm"
        rules={[
          {
            required: true,
            message: "Vui lòng chọn biến thể sản phẩm!",
          },
        ]}
      >
        <Select
          showSearch
          placeholder="Tìm kiếm SKU hoặc tên sản phẩm..."
          defaultActiveFirstOption={false}
          filterOption={false} // Disable client-side filtering
          onSearch={debouncedFetchVariants}
          notFoundContent={
            searchingVariants ? <Spin size="small" /> : "Không tìm thấy"
          }
          loading={searchingVariants}
          options={variantOptions.map((variant) => ({
            value: variant.id,
            label: `${variant.sku} - ${variant.product_name}`,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="code"
        label="Mã giảm giá (Code)"
        rules={[
          {
            required: true,
            message: "Vui lòng nhập mã giảm giá!",
          },
          {
            pattern: /^[a-zA-Z0-9_-]+$/,
            message: "Mã chỉ chứa chữ cái, số, gạch dưới, gạch ngang",
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item name="name" label="Tên chương trình giảm giá (Tùy chọn)">
        <Input />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="type"
            label="Loại giảm giá"
            rules={[
              {
                required: true,
                message: "Vui lòng chọn loại giảm giá!",
              },
            ]}
          >
            <Select onChange={handleTypeChange}>
              <Option value="Percentage">Phần trăm (%)</Option>
              <Option value="FixedAmount">Số tiền cố định (VND)</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="value"
            label="Giá trị"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập giá trị!",
              },
              // Dynamic validation based on type
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const type = getFieldValue("type");
                  if (value === undefined || value === null)
                    return Promise.resolve(); // Already handled by required
                  if (type === "Percentage") {
                    if (value >= 0 && value <= 100) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Giá trị phần trăm phải từ 0 đến 100!")
                    );
                  } else if (type === "FixedAmount") {
                    if (value >= 0) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Giá trị tiền phải lớn hơn hoặc bằng 0!")
                    );
                  } else {
                    // No type selected yet
                    return Promise.resolve();
                  }
                },
              }),
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              max={discountType === "Percentage" ? 100 : undefined}
              step={discountType === "Percentage" ? 0.1 : 1}
              formatter={(value: number | string | undefined) =>
                discountType === "FixedAmount"
                  ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  : `${value}`
              }
              parser={(value: string | undefined): string | number => {
                if (!value) {
                  return "";
                }
                const cleanedValue = discountType === "FixedAmount"
                  ? value.replace(/\$\s?|(,*)/g, "")
                  : value;
                const parsedValue = parseFloat(cleanedValue);
                return isNaN(parsedValue) ? value : parsedValue;
              }}
              addonAfter={discountType === "Percentage" ? "%" : "VND"}
              disabled={!discountType} // Disable until type is selected
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="dateRange" label="Thời gian hiệu lực (Tùy chọn)">
        <RangePicker showTime style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item name="status" label="Trạng thái">
        <Select>
          <Option value="Active">Hoạt động</Option>
          <Option value="Inactive">Không hoạt động</Option>
          <Option value="Expired">Hết hạn</Option>
        </Select>
      </Form.Item>

      {/* Submit button is handled by the Modal */}
    </Form>
  );
};

export default DiscountForm;
